import { Router, type Request, type Response } from 'express';
import { SignJWT } from 'jose';
import { config } from '../config/index.js';
import { getSupabaseClient } from '../services/supabase.service.js';
import { analyzeMaterialPhoto, generateEmbedding } from '../services/vision.service.js';
import { getMarketBenchmark, validateSellerPrice } from '../services/pricing.service.js';
import { generatePassport } from '../services/passport.service.js';
import { getTrustBadge } from '../services/trust.service.js';

function createToken(factoryId: string): Promise<string> {
  const secret = new TextEncoder().encode(config.jwt.secret);
  return new SignJWT({ sub: factoryId, scopes: ['factory'] })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

export function createApiRouter(): Router {
  const router = Router();
  const supabase = getSupabaseClient();

  // POST /api/auth/register — Register factory + return JWT
  router.post('/auth/register', async (req: Request, res: Response) => {
    try {
      const { mobile, factory_name, gstin, lat, lng, industry_type, whatsapp_opt_in } = req.body;

      if (!mobile || !factory_name || !industry_type) {
        res.status(400).json({ error: 'mobile, factory_name, and industry_type are required' });
        return;
      }

      const { data: existing } = await supabase
        .from('factories')
        .select('id')
        .eq('mobile', String(mobile))
        .maybeSingle();

      if (existing) {
        const token = await createToken(existing.id);
        res.json({ token, factory: existing, message: 'Already registered' });
        return;
      }

      const { data: factory, error } = await supabase
        .from('factories')
        .insert({
          name: factory_name,
          mobile: String(mobile),
          gstin: gstin || null,
          location: lat && lng ? `SRID=4326;POINT(${Number(lng)} ${Number(lat)})` : null,
          industry_type,
          whatsapp_opt_in: Boolean(whatsapp_opt_in),
        })
        .select()
        .single();

      if (error) {
        res.status(500).json({ error: `Registration failed: ${error.message}` });
        return;
      }

      const token = await createToken(factory.id);
      res.status(201).json({ token, factory, message: 'Factory registered successfully' });
    } catch (err) {
      res.status(500).json({ error: `Internal error: ${err instanceof Error ? err.message : 'unknown'}` });
    }
  });

  // POST /api/auth/login — Login with mobile, return JWT
  router.post('/auth/login', async (req: Request, res: Response) => {
    try {
      const { mobile } = req.body;
      if (!mobile) {
        res.status(400).json({ error: 'mobile is required' });
        return;
      }

      const { data: factory, error } = await supabase
        .from('factories')
        .select('*')
        .eq('mobile', String(mobile))
        .single();

      if (error || !factory) {
        res.status(401).json({ error: 'Factory not found with this mobile number' });
        return;
      }

      const token = await createToken(factory.id);
      res.json({ token, factory });
    } catch (err) {
      res.status(500).json({ error: `Internal error: ${err instanceof Error ? err.message : 'unknown'}` });
    }
  });

  // POST /api/listings — Create listing with photo
  router.post('/listings', async (req: Request, res: Response) => {
    try {
      const { photo_base64, seller_quoted_price_per_kg, quantity_kg, mobile, factory_id, material_description, negotiable } = req.body;

      if (!photo_base64 || !seller_quoted_price_per_kg || !quantity_kg || !mobile || !factory_id) {
        res.status(400).json({ error: 'photo_base64, seller_quoted_price_per_kg, quantity_kg, mobile, and factory_id are required' });
        return;
      }

      // Validate photo size
      const photoBuffer = Buffer.from(String(photo_base64), 'base64');
      if (photoBuffer.length > 5 * 1024 * 1024) {
        res.status(400).json({ error: 'Photo is too large. Maximum size is 5MB.' });
        return;
      }

      // Verify factory
      const { data: factory } = await supabase
        .from('factories')
        .select('*')
        .eq('id', factory_id)
        .single();

      if (!factory) {
        res.status(404).json({ error: 'Factory not found. Please register first.' });
        return;
      }

      // Analyze photo
      const analysis = await analyzeMaterialPhoto(String(photo_base64), material_description as string | undefined);

      if (analysis.confidence < 0.5) {
        res.status(422).json({
          listing: null,
          ai_analysis: analysis,
          message: 'AI could not clearly identify this material. Please take another photo with better lighting.',
        });
        return;
      }

      // Price benchmark & validation
      const benchmark = getMarketBenchmark(analysis.material_type, analysis.grade);
      const priceCheck = benchmark
        ? validateSellerPrice(Number(seller_quoted_price_per_kg), benchmark)
        : { isReasonable: true, flag: null, message: null };

      // Upload photo to storage
      let photoUrls: string[] = [];
      try {
        const photoPath = `listing_photos/${factory_id}/${Date.now()}.jpg`;
        const { data: upload } = await supabase.storage
          .from('listings')
          .upload(photoPath, photoBuffer, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (upload?.path) {
          const { data: publicUrl } = supabase.storage.from('listings').getPublicUrl(upload.path);
          photoUrls = [publicUrl.publicUrl];
        }
      } catch {
        photoUrls = [`listing_photos/${factory_id}/${Date.now()}.jpg`];
      }

      // Embedding
      const embeddingText = [
        analysis.material_type,
        analysis.grade,
        ...analysis.usage_classification,
        material_description || '',
      ].join(' ');
      const embedding = await generateEmbedding(embeddingText);

      // Generate Digital Product Passport
      const trustScore = factory.trust_score || 50;
      const passport = await generatePassport({
        materialType: analysis.material_type,
        grade: analysis.grade,
        quantityKg: Number(quantity_kg),
        availability: 'one_time',
        healthFlags: analysis.health_flags,
        usageClassification: analysis.usage_classification,
        confidence: analysis.confidence,
        sellerPrice: Number(seller_quoted_price_per_kg),
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

      // Insert listing
      const { data: listing, error } = await supabase
        .from('listings')
        .insert({
          factory_id,
          material_type: analysis.material_type,
          grade: analysis.grade,
          quantity_kg: Number(quantity_kg),
          availability: 'one_time',
          seller_quoted_price_per_kg: Number(seller_quoted_price_per_kg),
          ai_benchmark_price_per_kg: benchmark?.market_price_per_kg || null,
          negotiable: negotiable !== undefined ? Boolean(negotiable) : true,
          usage_classification: analysis.usage_classification,
          health_flags: analysis.health_flags,
          status: 'verified',
          photo_urls: photoUrls,
          embedding,
          digital_passport: passport,
        })
        .select('*, factories:factory_id(name, location, trust_score, mobile)')
        .single();

      if (error) {
        res.status(500).json({ error: `Listing could not be saved: ${error.message}` });
        return;
      }

      // Update passport_id to match listing ID
      passport.passport_id = listing.id;
      await supabase.from('listings').update({ digital_passport: passport }).eq('id', listing.id);

      res.status(201).json({
        listing: { ...listing, digital_passport: passport },
        digital_passport: passport,
        price_validation: priceCheck,
        message: priceCheck.flag ? `Price flagged: ${priceCheck.flag}` : 'Listing created successfully',
      });
    } catch (err) {
      res.status(500).json({ error: `Internal error: ${err instanceof Error ? err.message : 'unknown'}` });
    }
  });

  // GET /api/listings — List verified listings
  router.get('/listings', async (req: Request, res: Response) => {
    try {
      const { material_type, grade, min_price, max_price, limit, offset } = req.query;

      let query = supabase
        .from('listings')
        .select('*, factories:factory_id(name, location, trust_score)')
        .eq('status', 'verified')
        .order('created_at', { ascending: false });

      if (material_type) query = query.eq('material_type', String(material_type));
      if (grade) query = query.eq('grade', String(grade));
      if (min_price) query = query.gte('seller_quoted_price_per_kg', Number(min_price));
      if (max_price) query = query.lte('seller_quoted_price_per_kg', Number(max_price));
      if (limit) query = query.limit(Number(limit));
      if (offset) query = query.range(Number(offset), Number(offset) + (Number(limit) || 20) - 1);

      const { data: listings, error } = await query;

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.json({ listings, count: listings?.length || 0 });
    } catch (err) {
      res.status(500).json({ error: `Internal error: ${err instanceof Error ? err.message : 'unknown'}` });
    }
  });

  // GET /api/listings/:id — Single listing detail
  router.get('/listings/:id', async (req: Request, res: Response) => {
    try {
      const { data: listing, error } = await supabase
        .from('listings')
        .select('*, factories:factory_id(name, location, trust_score)')
        .eq('id', req.params.id)
        .single();

      if (error || !listing) {
        res.status(404).json({ error: 'Listing not found' });
        return;
      }

      res.json({ listing });
    } catch (err) {
      res.status(500).json({ error: `Internal error: ${err instanceof Error ? err.message : 'unknown'}` });
    }
  });

  // GET /api/listings/:id/passport — Get Digital Product Passport
  router.get('/listings/:id/passport', async (req: Request, res: Response) => {
    try {
      const { data: listing, error } = await supabase
        .from('listings')
        .select('digital_passport, material_type, grade, factory_id')
        .eq('id', req.params.id)
        .single();

      if (error || !listing) {
        res.status(404).json({ error: 'Listing not found' });
        return;
      }

      if (!listing.digital_passport) {
        res.status(404).json({ error: 'Digital passport not yet generated for this listing' });
        return;
      }

      res.json({ digital_passport: listing.digital_passport });
    } catch (err) {
      res.status(500).json({ error: `Internal error: ${err instanceof Error ? err.message : 'unknown'}` });
    }
  });

  // POST /api/listings/:id/contact — Request contact info (buyer intent)
  router.post('/listings/:id/contact', async (req: Request, res: Response) => {
    try {
      const { buyer_id } = req.body;
      const { id: listingId } = req.params;

      if (!buyer_id) {
        res.status(400).json({ error: 'buyer_id is required' });
        return;
      }

      const { data: listing } = await supabase
        .from('listings')
        .select('factory_id')
        .eq('id', listingId)
        .single();

      if (!listing) {
        res.status(404).json({ error: 'Listing not found' });
        return;
      }

      // Fetch factory contact info
      const { data: factory } = await supabase
        .from('factories')
        .select('name, mobile')
        .eq('id', listing.factory_id)
        .single();

      if (!factory) {
        res.status(404).json({ error: 'Factory not found' });
        return;
      }

      // Log the contact reveal
      await supabase
        .from('contact_reveals')
        .insert({ listing_id: listingId, buyer_id })
        .select()
        .maybeSingle();

      res.json({
        contact: {
          factory_name: factory.name,
          mobile: factory.mobile,
        },
        message: 'Contact info revealed',
      });
    } catch (err) {
      res.status(500).json({ error: `Internal error: ${err instanceof Error ? err.message : 'unknown'}` });
    }
  });

  // POST /api/erp/sync — Sync ERP surplus
  router.post('/erp/sync', async (req: Request, res: Response) => {
    try {
      const { factory_id, erp_endpoint } = req.body;

      if (!factory_id) {
        res.status(400).json({ error: 'factory_id is required' });
        return;
      }

      const isSimulated = !erp_endpoint || String(erp_endpoint).includes('simulated');

      let surplusItems: Array<{ material: string; quantity: number; grade: string; usage: string[] }>;

      if (isSimulated) {
        surplusItems = [
          { material: 'aluminum_scrap', quantity: 500, grade: 'B', usage: ['remelting', 'casting', 'die_casting'] },
          { material: 'steel_offcut', quantity: 1200, grade: 'A', usage: ['remelting', 'rebar_manufacturing', 'forging'] },
          { material: 'hdpe_regrind', quantity: 300, grade: 'B', usage: ['injection_molding', 'pipe_extrusion'] },
          { material: 'copper_wire', quantity: 150, grade: 'C', usage: ['remelting', 'wire_drawing'] },
          { material: 'pp_granulate', quantity: 800, grade: 'A', usage: ['injection_molding', 'packaging'] },
          { material: 'textile_waste', quantity: 600, grade: 'B', usage: ['padding', 'insulation', 'recycling'] },
        ];
      } else {
        try {
          const erpUrl = String(erp_endpoint);
          const response = await fetch(erpUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_disposal_queue', factory_id }),
          });
          surplusItems = await response.json() as typeof surplusItems;
        } catch {
          res.status(502).json({ error: 'ERP endpoint unreachable, try simulated mode by omitting erp_endpoint' });
          return;
        }
      }

      res.json({ items: surplusItems, source: isSimulated ? 'simulated' : 'erp' });
    } catch (err) {
      res.status(500).json({ error: `Internal error: ${err instanceof Error ? err.message : 'unknown'}` });
    }
  });

  return router;
}
