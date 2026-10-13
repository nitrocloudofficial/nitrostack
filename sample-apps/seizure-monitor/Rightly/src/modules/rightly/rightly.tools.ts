import { ToolDecorator as Tool, Widget, Injectable, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { GeminiService } from '../../services/gemini.service.js';
import { EmailService } from '../../services/email.service.js';
import { SearchService } from '../../services/search.service.js';

/**
 * RightlyTools
 * 
 * Implements all MCP tools for the Rightly server.
 * Includes Resolution Agent and Purchase Agent tools.
 */
@Injectable({ deps: [GeminiService, EmailService, SearchService] })
export class RightlyTools {
  constructor(
    private geminiService: GeminiService,
    private emailService: EmailService,
    private searchService: SearchService
  ) {}

  // ============================================================================
  // RESOLUTION AGENT TOOLS
  // ============================================================================

  @Tool({
    name: 'analyseReceipt',
    description: 'Analyze a receipt image and extract purchase details',
    inputSchema: z.object({
      receiptBase64: z.string().optional().describe('Base64 encoded receipt image file content. Will be injected by system.')
    })
  })
  async analyseReceipt(input: { receiptBase64?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Analyzing receipt');
    try {
      const result = await this.geminiService.analyzeReceipt(input.receiptBase64 || 'sample_receipt');
      return {
        status: 'success',
        ...result,
        data: result
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        error: { message }
      };
    }
  }

  @Tool({
    name: 'analyseDamage',
    description: 'Analyze product damage from images and assess severity',
    inputSchema: z.object({
      damageImagesBase64: z.array(z.string()).optional().describe('Array of base64 encoded damage image file contents')
    })
  })
  async analyseDamage(input: { damageImagesBase64?: string[] }, ctx: ExecutionContext) {
    ctx.logger.info('Analyzing damage');
    try {
      const result = await this.geminiService.analyzeDamage(input.damageImagesBase64 || ['sample_damage']);
      return {
        status: 'success',
        ...result,
        data: result
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        error: { message }
      };
    }
  }

  @Tool({
    name: 'createResolutionPlan',
    description: 'Create a resolution plan based on receipt and damage analysis',
    inputSchema: z.object({
      receiptData: z.object({
        vendor: z.string().optional().describe('Seller or store name'),
        date: z.string().optional().describe('Purchase date'),
        total: z.number().optional().describe('Total amount paid'),
        productName: z.string().optional().describe('Name of the product')
      }).optional().describe('Receipt analysis data'),
      damageData: z.object({
        damageType: z.string().optional().describe('Type of damage'),
        severity: z.string().optional().describe('Severity: minor, moderate, severe'),
        description: z.string().optional().describe('Damage description')
      }).optional().describe('Damage analysis data'),
      vendorName: z.string().optional().describe('Vendor or store name'),
      productName: z.string().optional().describe('Product name'),
      issueDescription: z.string().optional().describe('Description of the issue')
    })
  })
  @Widget('resolution-plan')
  async createResolutionPlan(input: {
    receiptData?: { vendor?: string; date?: string; total?: number; productName?: string };
    damageData?: { damageType?: string; severity?: string; description?: string };
    vendorName?: string;
    productName?: string;
    issueDescription?: string;
  }, ctx: ExecutionContext) {
    ctx.logger.info('Creating resolution plan');
    try {
      const vendorName = input.vendorName || input.receiptData?.vendor || 'Seller';
      const productName = input.productName || input.receiptData?.productName || 'Purchased Product';
      const purchaseDate = input.receiptData?.date || new Date().toISOString().split('T')[0];

      const prompt = `Based on this purchase and damage information, create a resolution plan for consumer protection:
Vendor: ${vendorName}
Product: ${productName}
Purchase Date: ${purchaseDate}
Total Paid: $${input.receiptData?.total ?? 'N/A'}
Damage Info: ${input.damageData?.damageType ?? 'Defect'} (${input.damageData?.severity ?? 'moderate'}) - ${input.damageData?.description ?? input.issueDescription ?? 'Product defect'}

Provide a JSON response with:
- recommendation: one of "refund", "replacement", "repair", "return", or "escalation"
- reasoning: Detailed explanation supporting this recommendation based on consumer rights
- evidenceUsed: Array of strings listing evidence used (e.g. ["Purchase Receipt", "Damage Photograph", "Consumer Protection Guidelines"])
- missingInformation: Array of strings listing any missing evidence (e.g. ["Serial number", "Clearer photo of warranty seal"]) or empty array
- nextActions: Array of action steps (e.g. ["Lookup Seller Support", "Generate Legal Notice", "Send Legal Notice"])`;

      const schema = z.object({
        recommendation: z.enum(['refund', 'replacement', 'repair', 'return', 'escalation']),
        reasoning: z.string(),
        evidenceUsed: z.array(z.string()),
        missingInformation: z.array(z.string()).optional(),
        nextActions: z.array(z.string())
      });

      const result = await this.geminiService.call(prompt, schema);
      
      const responseData = {
        recommendation: result.recommendation,
        reasoning: result.reasoning,
        evidenceUsed: result.evidenceUsed || ['Purchase Receipt', 'Damage Photograph'],
        missingInformation: result.missingInformation || [],
        nextActions: result.nextActions || ['Lookup Seller Support', 'Generate Legal Notice', 'Send Legal Notice'],
        vendorName,
        productName,
        purchaseDate
      };

      return {
        status: 'success',
        ...responseData,
        data: responseData
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        error: { message }
      };
    }
  }

  @Tool({
    name: 'generateLegalNotice',
    description: 'Generate a formal legal notice text based on receipt and damage analysis',
    inputSchema: z.object({
      vendorName: z.string().optional().describe('Name of the seller/vendor'),
      purchaseDate: z.string().optional().describe('Date of purchase (ISO format)'),
      productName: z.string().optional().describe('Name of the product'),
      issueDescription: z.string().optional().describe('Description of the issue or damage'),
      desiredResolution: z.enum(['refund', 'replacement', 'repair']).optional().describe('Desired resolution type')
    })
  })
  @Widget('generate-legal-notice')
  async generateLegalNotice(input: {
    vendorName?: string;
    purchaseDate?: string;
    productName?: string;
    issueDescription?: string;
    desiredResolution?: 'refund' | 'replacement' | 'repair';
  }, ctx: ExecutionContext) {
    const vName = input.vendorName || 'The Vendor';
    const pName = input.productName || 'The Product';
    const issue = input.issueDescription || 'Defective product';
    
    ctx.logger.info('Generating legal notice', { vendor: vName });
    try {
      const prompt = `Generate a formal legal notice for a consumer protection case.

Vendor: ${vName}
Product: ${pName}
Purchase Date: ${input.purchaseDate || new Date().toISOString().split('T')[0]}
Issue: ${issue}
Desired Resolution: ${input.desiredResolution || 'refund'}

Generate a professional, formal legal notice and return it as JSON with the following fields:
- notice_title (string)
- recipient (string)
- product (string)
- purchase_date (string)
- notice_text (string) - This should contain the full, formal legal letter with professional tone, referencing consumer protection rights, requesting the desired resolution, and setting a 14-day deadline.

Return ONLY valid JSON.`;

      const response = await this.geminiService.call(
        prompt,
        z.object({ 
          notice_title: z.string().optional(),
          recipient: z.string().optional(),
          product: z.string().optional(),
          purchase_date: z.string().optional(),
          notice_text: z.string().optional(),
          notice: z.string().optional() // fallback
        }),
        { systemPrompt: 'You are a legal document specialist. Generate professional, legally sound consumer protection notices.' }
      );

      return {
        status: 'success',
        data: {
          noticeText: response.notice_text || response.notice || 'Legal notice generated.',
          noticeTitle: response.notice_title || 'FORMAL LEGAL NOTICE',
          vendorName: response.recipient || vName,
          productName: response.product || pName,
          desiredResolution: input.desiredResolution || 'refund'
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.logger.error('Failed to generate legal notice', { error: message });
      return {
        status: 'error',
        error: { message }
      };
    }
  }

  @Tool({
    name: 'sendLegalNotice',
    description: 'Send a generated legal notice via email to the seller (requires user approval)',
    inputSchema: z.object({
      noticeText: z.string().describe('The legal notice text to send'),
      recipientEmail: z.string().email().describe('Seller email address (user-provided)'),
      vendorName: z.string().describe('Name of the vendor'),
      productName: z.string().describe('Name of the product')
    })
  })
  async sendLegalNotice(input: {
    noticeText: string;
    recipientEmail: string;
    vendorName: string;
    productName: string;
  }, ctx: ExecutionContext) {
    ctx.logger.info('Sending legal notice', { vendor: input.vendorName, recipient: input.recipientEmail });
    try {
      const result = await this.emailService.sendLegalNotice(
        input.recipientEmail,
        'Valued Customer',
        input.noticeText,
        input.vendorName
      );

      if (!result.success) {
        ctx.logger.error('Failed to send legal notice', { error: result.error });
        return {
          status: 'error',
          error: { message: result.error || 'Failed to send email' }
        };
      }

      ctx.logger.info('Legal notice sent successfully', { messageId: result.messageId });
      return {
        status: 'success',
        data: {
          messageId: result.messageId,
          sent: true,
          timestamp: new Date().toISOString(),
          recipientEmail: input.recipientEmail,
          vendorName: input.vendorName
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.logger.error('Exception sending legal notice', { error: message });
      return {
        status: 'error',
        error: { message }
      };
    }
  }

  @Tool({
    name: 'findRepairCentre',
    description: 'Find authorized repair centers for the product',
    inputSchema: z.object({
      productType: z.string(),
      location: z.string().optional()
    })
  })
  @Widget('find-repair-center')
  async findRepairCentre(input: { productType: string; location?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Finding repair centers');
    try {
      const results = await this.searchService.searchRepairCenters(
        input.productType,
        input.location
      );

      return {
        status: 'success',
        data: {
          repairCenters: results,
          count: results.length
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        error: { message }
      };
    }
  }

  // ============================================================================
  // PURCHASE AGENT TOOLS
  // ============================================================================



  @Tool({
    name: 'discoverAlternatives',
    description: 'Discover similar alternative products',
    inputSchema: z.object({
      productName: z.string(),
      category: z.string(),
      limit: z.number().optional().default(3)
    })
  })
  async discoverAlternatives(input: {
    productName: string;
    category: string;
    limit?: number;
  }, ctx: ExecutionContext) {
    ctx.logger.info('Discovering alternatives');
    try {
      const results = await this.searchService.searchSimilarProducts(
        input.productName,
        input.category,
        input.limit || 3
      );

      return {
        status: 'success',
        data: {
          alternatives: results,
          count: results.length
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        error: { message }
      };
    }
  }

  @Tool({
    name: 'lookupSellerSupport',
    description: 'Find seller support contact information',
    inputSchema: z.object({
      sellerName: z.string()
    })
  })
  @Widget('lookup-seller-support')
  async lookupSellerSupport(input: { sellerName: string }, ctx: ExecutionContext) {
    ctx.logger.info('Looking up seller support');
    try {
      const results = await this.searchService.searchSellerSupport(input.sellerName);

      return {
        status: 'success',
        data: {
          supportPages: results,
          count: results.length
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        error: { message }
      };
    }
  }

  @Tool({
    name: 'scheduleFollowUp',
    description: 'Generate a dispute follow-up reminder and ICS calendar file',
    inputSchema: z.object({
      reminderTitle: z.string().optional().describe('Title of the follow-up reminder'),
      daysFromNow: z.number().optional().default(14).describe('Number of days until follow-up (default 14)')
    })
  })
  @Widget('schedule-follow-up')
  async scheduleFollowUp(input: { reminderTitle?: string; daysFromNow?: number }, ctx: ExecutionContext) {
    ctx.logger.info('Scheduling dispute follow-up reminder');
    try {
      const days = input.daysFromNow || 14;
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + days);

      const title = input.reminderTitle || 'Follow up on consumer dispute / seller response';
      const formattedDate = followUpDate.toISOString().split('T')[0];

      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Rightly//Consumer Protection Reminder//EN',
        'BEGIN:VEVENT',
        `SUMMARY:${title}`,
        `DESCRIPTION:Check if the seller has responded to your legal notice or dispute request.`,
        `DTSTART;VALUE=DATE:${formattedDate.replace(/-/g, '')}`,
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const nextDate = new Date(followUpDate);
      nextDate.setDate(nextDate.getDate() + 1);
      const formattedNextDate = nextDate.toISOString().split('T')[0];

      const dateCompact = formattedDate.replace(/-/g, '');
      const dateCompactNext = formattedNextDate.replace(/-/g, '');
      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent('Check if seller responded to legal notice / dispute request.')}&dates=${dateCompact}/${dateCompactNext}`;

      const responseData = {
        reminderTitle: title,
        reminderDate: formattedDate,
        suggestedAction: 'Check seller inbox and verify if refund/replacement was processed.',
        googleCalendarUrl,
        icsContent
      };

      return {
        status: 'success',
        ...responseData,
        data: responseData
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        error: { message }
      };
    }
  }
}
