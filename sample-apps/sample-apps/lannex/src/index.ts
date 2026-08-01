/**
 * Calculator MCP Server
 * 
 * Main entry point for the MCP server.
 * Uses the @McpApp decorator pattern for clean, NestJS-style architecture.
 * 
 * Transport Configuration:
 * - Development (NODE_ENV=development): STDIO only
 * - Production (NODE_ENV=production): Dual transport (STDIO + HTTP SSE)
 */

import 'dotenv/config';
import { McpApplicationFactory, emitEvent } from '@nitrostack/core';
import { AppModule } from './app.module.js';
import express from 'express';
import bodyParser from 'body-parser';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Bootstrap the application
 */
async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  
  const app = express();
  app.use(bodyParser.json());

  app.post('/webhook/receipt', (req, res) => {
    const { file_name, file_content } = req.body;
    if (!file_name || !file_content) {
      return res.status(400).json({ success: false, error: 'Missing file_name or file_content' });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const safeName = path.basename(file_name);
    const filePath = path.join(uploadsDir, safeName);

    const matches = file_content.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const buffer = matches ? Buffer.from(matches[2], 'base64') : Buffer.from(file_content, 'base64');
    fs.writeFileSync(filePath, buffer);

    console.log(`✅ Receipt saved: ${filePath}`);
    res.json({ success: true, filePath });
  });

  app.post('/webhook/sms', (req, res) => {
    let text = req.body.text || '';
    
    // REDACTION FILTER: Scrub sensitive data before processing
    
    // 1. Mask 4+ digit numbers (OTPs, Account Numbers, Card Numbers)
    text = text.replace(/\b\d{4,}\b/g, (match: string) => {
      if (match.length <= 6) return '[MASKED_OTP]'; 
      return '****' + match.slice(-4); // Mask long account numbers, show only last 4 digits
    });
    
    // 2. Mask Available Balances (e.g. "Available Bal: Rs 14,500.00")
    text = text.replace(/(?:available\s*bal|avail\s*bal|avl\s*bal|balance)[a-z\s.:-]*?((?:rs\.?|₹|inr)\s*[\d,]+\.?\d*|[\d,]+\.?\d*\s*(?:rs\.?|₹|inr))/ig, 'Available Bal: [MASKED]');

    let amount = 0;
    let merchant = 'Unknown';
    let type: 'expense' | 'income' = 'expense';
    
    const amountMatch = text.match(/(?:rs\.?|₹|inr)\s*([\d,]+\.?\d*)/i) || text.match(/([\d,]+\.?\d*)\s*(?:rs\.?|₹|inr)/i);
    if (amountMatch) amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    
    if (text.toLowerCase().includes('credited') || text.toLowerCase().includes('received') || text.toLowerCase().includes('deposited')) {
      type = 'income';
    } else if (text.toLowerCase().includes('debited') || text.toLowerCase().includes('paid') || text.toLowerCase().includes('sent')) {
      type = 'expense';
    }

    const atMatch = text.match(/at\s+([A-Za-z0-9\s]+?)(?=\s|$|\.)/i) || text.match(/to\s+([A-Za-z0-9\s]+?)(?=\s|$|\.)/i);
    if (atMatch) merchant = atMatch[1].trim();

    emitEvent('sms.received', { text, parsed: { amount, merchant, type } });
    
    res.json({ success: true, parsed: { amount, merchant, type } });
  });

  const webhookPort = process.env.WEBHOOK_PORT || 3001;
  app.listen(webhookPort, () => {
    console.log(`✅ Webhook server listening on port ${webhookPort}`);
  });

  await server.start();
}

// Start the application
bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
