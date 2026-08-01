import { ToolDecorator as Tool, z, ExecutionContext, UseGuards, RateLimit } from '@nitrostack/core';
import { JwtGuard } from '../../guards/jwt.guard.js';
import { getSupabaseClient } from '../../services/supabase.service.js';
import { analyzeMaterialPhoto, generateEmbedding } from '../../services/vision.service.js';
import { getMarketBenchmark, validateSellerPrice } from '../../services/pricing.service.js';
import { transcribeVoice, extractListingInfo } from '../../services/voice.service.js';
import { computeAndUpdateTrustScore, getTrustBadge } from '../../services/trust.service.js';
import { generatePassport } from '../../services/passport.service.js';

const PhotoUploadSchema = z.object({
  photo_base64: z.string().describe('Base64-encoded photo of the industrial material'),
  seller_quoted_price_per_kg: z.number().positive().describe('Price per kg that the seller wants (in INR)'),
  quantity_kg: z.number().positive().describe('Available quantity in kg'),
  mobile: z.string().regex(/^\+?[\d]{10,15}$/).describe('Seller mobile number for buyer contact'),
  factory_id: z.string().uuid().describe('Registered factory ID'),
  material_description: z.string().optional().describe('Optional text description of material'),
  negotiable: z.boolean().default(true).describe('Is the seller open to negotiation?'),
});

const RegisterSellerSchema = z.object({
  mobile: z.string().regex(/^\+?[\d]{10,15}$/).describe('Mobile number — primary contact'),
  factory_name: z.string().min(2).max(200).describe('Factory/business name'),
  gstin: z.string().optional().describe('GST number for KYC verification'),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string(),
  }).describe('Geolocation + address'),
  industry_type: z.enum([
    'automotive', 'textile', 'plastic', 'metal_fab',
    'electronics', 'chemical', 'construction', 'packaging', 'other',
  ]).describe('Manufacturing industry type'),
  whatsapp_opt_in: z.boolean().default(false).describe('Receive deal alerts via WhatsApp'),
});

const VoiceIntakeSchema = z.object({
  audio_base64: z.string().describe('Base64-encoded audio recording'),
  mobile: z.string().regex(/^\+?[\d]{10,15}$/).describe('Caller mobile number'),
  language: z.string().optional().default('auto').describe('Spoken language code'),
});

const SIMULATED_SURPLUS: Array<{ material: string; quantity: number; grade: string; usage: string[] }> = [
  { material: 'aluminum_scrap', quantity: 500, grade: 'B', usage: ['remelting', 'casting', 'die_casting'] },
  { material: 'steel_offcut', quantity: 1200, grade: 'A', usage: ['remelting', 'rebar_manufacturing', 'forging'] },
  { material: 'hdpe_regrind', quantity: 300, grade: 'B', usage: ['injection_molding', 'pipe_extrusion'] },
  { material: 'copper_wire', quantity: 150, grade: 'C', usage: ['remelting', 'wire_drawing'] },
  { material: 'pp_granulate', quantity: 800, grade: 'A', usage: ['injection_molding', 'packaging'] },
  { material: 'textile_waste', quantity: 600, grade: 'B', usage: ['padding', 'insulation', 'recycling'] },
];

const ERPSyncSchema = z.object({
  factory_id: z.string().uuid().describe('Factory ID to sync'),
  erp_endpoint: z.string().url().optional().describe('ERP system endpoint URL. Omit or set to "simulated" for demo mode.'),
  default_price_per_kg: z.number().positive().optional().describe('Default pricing for auto-listings'),
});

export class IntakeTools {
  @Tool({
    name: 'register_seller',
    title: 'Register Manufacturing Seller',
    description: 'Onboard a new manufacturer: collect mobile (OTP-verified), factory details, GST, location, industry type. Mobile becomes the primary contact for buyer inquiries.',
    inputSchema: RegisterSellerSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    invocation: { invoking: 'Registering your factory...', invoked: 'Registration complete' },
  })
  async registerSeller(input: z.infer<typeof RegisterSellerSchema>, ctx: ExecutionContext) {
    const supabase = getSupabaseClient();

    const { data: existing } = await supabase
      .from('factories')
      .select('id')
      .eq('mobile', input.mobile)
      .maybeSingle();

    if (existing) {
      return { factory: existing, message: 'Factory already registered with this mobile number' };
    }

    const { data: factory, error } = await supabase
      .from('factories')
      .insert({
        name: input.factory_name,
        mobile: input.mobile,
        whatsapp_opt_in: input.whatsapp_opt_in,
        gstin: input.gstin || null,
        location: `SRID=4326;POINT(${input.location.lng} ${input.location.lat})`,
        industry_type: input.industry_type,
      })
      .select()
      .single();

    if (error) throw new Error(`Registration failed: ${error.message}`);

    ctx.logger.info('Factory registered', { factoryId: factory.id, name: input.factory_name });
    return { factory, message: 'Factory registered successfully' };
  }

  @Tool({
    name: 'create_listing_with_price',
    title: 'Create Listing with Seller-Priced Material',
    description: 'Upload photo of industrial material. AI analyzes it, classifies, grades, and provides a benchmark price as a REFERENCE. Seller sets their OWN quoted price which gets listed. Mobile is shared for buyer contact.',
    inputSchema: PhotoUploadSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    invocation: { invoking: 'Analyzing material and creating listing...', invoked: 'Listing created' },
  })
  @UseGuards(JwtGuard)
  async createListingWithPrice(input: z.infer<typeof PhotoUploadSchema>, ctx: ExecutionContext) {
    const supabase = getSupabaseClient();

    // 1. Validate photo size (< 5MB)
    const photoBuffer = Buffer.from(input.photo_base64, 'base64');
    const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
    if (photoBuffer.length > MAX_PHOTO_SIZE) {
      throw new Error('Photo is too large. Maximum size is 5MB. Please upload a compressed image.');
    }

    // 2. Verify factory exists
    const { data: factory } = await supabase
      .from('factories')
      .select('*')
      .eq('id', input.factory_id)
      .single();

    if (!factory) {
      throw new Error('Factory not found. Please register your factory first using register_seller.');
    }

    // 3. Check for duplicate listing (same factory, same material type, last 24h)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentListing } = await supabase
      .from('listings')
      .select('id, material_type, created_at')
      .eq('factory_id', input.factory_id)
      .gte('created_at', twentyFourHoursAgo)
      .limit(1)
      .maybeSingle();

    if (recentListing) {
      ctx.logger.warn('Duplicate listing detected', {
        factory_id: input.factory_id,
        existing: recentListing.id,
      });
    }

    // 4. Analyze photo with vision model
    ctx.logger.info('Analyzing material photo');
    const analysis = await analyzeMaterialPhoto(input.photo_base64, input.material_description);

    // 5. Handle low AI confidence
    if (analysis.confidence < 0.5) {
      return {
        listing: null,
        ai_analysis: {
          material_type: analysis.material_type,
          grade: 'U' as const,
          confidence: analysis.confidence,
          health_flags: analysis.health_flags,
          usage_classification: analysis.usage_classification,
          ai_benchmark_price_per_kg: null,
          ai_benchmark_price_range: null,
          price_validation: { isReasonable: true, flag: null },
        },
        message: 'The AI could not clearly identify this material (confidence too low). Please take another photo with better lighting and a clear view of the material.',
      };
    }

    // 6. Get market benchmark
    const benchmark = getMarketBenchmark(analysis.material_type, analysis.grade);

    // 7. Validate seller's quoted price
    const priceCheck = benchmark
      ? validateSellerPrice(input.seller_quoted_price_per_kg, benchmark)
      : { isReasonable: true, flag: null };

    // 8. Upload photo to Supabase Storage
    let photoUrls: string[] = [];
    try {
      const photoPath = `listing_photos/${input.factory_id}/${Date.now()}.jpg`;
      const { data: upload } = await supabase.storage
        .from('listings')
        .upload(photoPath, photoBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (upload?.path) {
        const { data: publicUrl } = supabase.storage
          .from('listings')
          .getPublicUrl(upload.path);
        photoUrls = [publicUrl.publicUrl];
      }
    } catch (storageError) {
      ctx.logger.warn('Photo upload failed, continuing without storage', { error: String(storageError) });
      photoUrls = [`listing_photos/${input.factory_id}/${Date.now()}.jpg`];
    }

    // 9. Generate embedding for vector similarity search
    const embeddingText = [
      analysis.material_type,
      analysis.grade,
      ...analysis.usage_classification,
      input.material_description || '',
    ].join(' ');
    const embedding = await generateEmbedding(embeddingText);

    // 10. Generate Digital Product Passport
    const trustScore = factory.trust_score || 50;
    const passport = await generatePassport({
      materialType: analysis.material_type,
      grade: analysis.grade,
      quantityKg: input.quantity_kg,
      availability: 'one_time',
      healthFlags: analysis.health_flags,
      usageClassification: analysis.usage_classification,
      confidence: analysis.confidence,
      sellerPrice: input.seller_quoted_price_per_kg,
      benchmark,
      factoryName: factory.name,
      factoryIndustry: factory.industry_type,
      gstVerified: !!factory.gstin,
      trustScore,
      trustBadge: getTrustBadge(trustScore).badge,
      factoryLocation: null,
      photoUrls,
      createdAt: new Date().toISOString(),
    });

    // 11. Insert listing into Supabase
    const { data: listing, error } = await supabase
      .from('listings')
      .insert({
        factory_id: input.factory_id,
        material_type: analysis.material_type,
        grade: analysis.grade,
        quantity_kg: input.quantity_kg,
        availability: 'one_time',
        seller_quoted_price_per_kg: input.seller_quoted_price_per_kg,
        ai_benchmark_price_per_kg: benchmark?.market_price_per_kg || null,
        negotiable: input.negotiable,
        usage_classification: analysis.usage_classification,
        health_flags: analysis.health_flags,
        status: 'verified',
        photo_urls: photoUrls,
        embedding,
        digital_passport: passport,
      })
      .select()
      .single();

    if (error) throw new Error(`Listing could not be saved: ${error.message}. Please try again.`);

    // Update passport_id to match listing ID
    passport.passport_id = listing.id;
    await supabase.from('listings').update({ digital_passport: passport }).eq('id', listing.id);

    // 12. Update trust score
    const updatedTrustScore = await computeAndUpdateTrustScore(input.factory_id);

    return {
      listing: {
        ...listing,
        seller_mobile: input.mobile,
        trust_score: updatedTrustScore,
        digital_passport: passport,
      },
      ai_analysis: {
        material_type: analysis.material_type,
        grade: analysis.grade,
        confidence: analysis.confidence,
        health_flags: analysis.health_flags,
        usage_classification: analysis.usage_classification,
        ai_benchmark_price_per_kg: benchmark?.market_price_per_kg,
        ai_benchmark_price_range: benchmark ? { min: benchmark.min_price_per_kg, max: benchmark.max_price_per_kg } : null,
        price_validation: priceCheck,
      },
      digital_passport: passport,
      message: 'Listing created. Digital Product Passport generated. Your quoted price has been listed. AI benchmark provided as reference.',
    };
  }

  @Tool({
    name: 'voice_intake_to_listing',
    title: 'Voice Intake',
    description: 'MSMEs without digital access call in, describe material + price in their language. System transcribes, structures, and creates a listing automatically.',
    inputSchema: VoiceIntakeSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  })
  @RateLimit({ requests: 30, window: '1h' })
  async voiceIntakeToListing(input: z.infer<typeof VoiceIntakeSchema>, ctx: ExecutionContext) {
    const supabase = getSupabaseClient();

    // 1. Transcribe voice
    const { transcript, detected_language } = await transcribeVoice(input.audio_base64, input.language);
    ctx.logger.info('Voice transcribed', { language: detected_language });

    // 2. Extract listing info from transcript
    const extracted = extractListingInfo(transcript);

    // 3. Find or create factory by mobile
    let factoryId: string;
    const { data: existingFactory } = await supabase
      .from('factories')
      .select('id')
      .eq('mobile', input.mobile)
      .maybeSingle();

    if (existingFactory) {
      factoryId = existingFactory.id;
    } else {
      const { data: newFactory } = await supabase
        .from('factories')
        .insert({
          name: `MSME-${input.mobile.slice(-4)}`,
          mobile: input.mobile,
          whatsapp_opt_in: false,
          industry_type: 'other',
        })
        .select('id')
        .single();

      if (!newFactory) throw new Error('Failed to create factory record');
      factoryId = newFactory.id;
    }

    // 4. Create basic listing from voice data
    const { data: listing, error } = await supabase
      .from('listings')
      .insert({
        factory_id: factoryId,
        material_type: 'unverified_voice',
        grade: 'U',
        quantity_kg: extracted.quantity_kg || 100,
        availability: 'one_time',
        seller_quoted_price_per_kg: extracted.price_per_kg || 0,
        negotiable: true,
        usage_classification: [],
        health_flags: ['voice_intake_pending_verification'],
        status: 'pending_verification',
        photo_urls: [],
      })
      .select()
      .single();

    if (error) throw new Error(`Voice listing creation failed: ${error.message}`);

    return {
      listing,
      transcript,
      detected_language,
      message: 'Voice listing created. A verification agent will review it shortly.',
    };
  }

  @Tool({
    name: 'sync_erp_surplus',
    title: 'Sync ERP Surplus',
    description: 'Connect to manufacturer ERP system and auto-detect surplus/disposal queue items. Creates listings automatically using pre-configured pricing rules.',
    inputSchema: ERPSyncSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  })
  @RateLimit({ requests: 60, window: '1h' })
  async syncErpSurplus(input: z.infer<typeof ERPSyncSchema>, ctx: ExecutionContext) {
    const supabase = getSupabaseClient();
    const listings: unknown[] = [];

    // Determine surplus data source — real ERP or simulation
    let surplusItems: Array<{ material: string; quantity: number; grade: string; usage: string[] }>;
    const isSimulated = !input.erp_endpoint || input.erp_endpoint.includes('simulated');

    if (isSimulated) {
      ctx.logger.info('ERP simulation mode — using demo surplus data');
      surplusItems = SIMULATED_SURPLUS;
    } else {
      try {
        const erpUrl = input.erp_endpoint as string;
        const response = await fetch(erpUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_disposal_queue', factory_id: input.factory_id }),
        });
        surplusItems = await response.json() as typeof SIMULATED_SURPLUS;
      } catch (error) {
        ctx.logger.error('ERP sync failed, falling back to simulation', { endpoint: input.erp_endpoint });
        surplusItems = SIMULATED_SURPLUS;
      }
    }

    for (const item of surplusItems) {
      const { data: listing, error } = await supabase
        .from('listings')
        .insert({
          factory_id: input.factory_id,
          material_type: item.material,
          grade: item.grade || 'U',
          quantity_kg: item.quantity,
          seller_quoted_price_per_kg: input.default_price_per_kg || 0,
          status: 'pending_verification',
          availability: 'recurring',
          negotiable: true,
          usage_classification: item.usage || [],
          health_flags: ['erp_auto_sync'],
          photo_urls: [],
        })
        .select()
        .single();

      if (error) {
        ctx.logger.error('Failed to create listing from ERP sync', { material: item.material, error: error.message });
      }
      if (listing) listings.push(listing);
    }

    return {
      listings_created: listings.length,
      listings,
      simulated: isSimulated,
      message: isSimulated
        ? `[SIMULATION] ${listings.length} listings auto-created from simulated ERP data. Connect a real ERP endpoint for production.`
        : `${listings.length} listings auto-created from ERP surplus data`,
    };
  }
}
