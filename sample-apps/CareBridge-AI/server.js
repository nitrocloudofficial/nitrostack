// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { callTool } from './config/nitrostack.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (HTML interface)
app.use(express.static(path.join(__dirname, 'public')));

// Health Check
app.get('/', (req, res) => {
  res.json({ message: "CareBridge Backend is Running ✅", mcp: process.env.MCP_URL });
});

// ================== API ROUTES ==================

// 1. Symptom Checker
app.post('/api/symptoms/analyze', async (req, res) => {
  const result = await callTool('symptom-guidance', req.body);
  res.json(result);
});

// 2. OCR Report Extractor
app.post('/api/reports/extract', async (req, res) => {
  const result = await callTool('ocr-extractor', req.body);
  res.json(result);
});

// 3. Lab Report Analyzer
app.post('/api/reports/analyze', async (req, res) => {
  const result = await callTool('report-analysis', req.body);
  res.json(result);
});

// 4. Health Trends
app.post('/api/trends/analyze', async (req, res) => {
  const result = await callTool('trend-analysis', req.body);
  res.json(result);
});

// 5. Doctor Summary
app.post('/api/summary/generate', async (req, res) => {
  const result = await callTool('health-summary', req.body);
  res.json(result);
});

// 6. 🚨 EMERGENCY FIRST AID (NEW!)
app.post('/api/emergency/guide', async (req, res) => {
  const result = await callTool('emergency-guidance', req.body);
  res.json(result);
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📡 MCP URL: ${process.env.MCP_URL}`);
  console.log(`✅ 6 AI Agents Ready: Symptoms, OCR, Reports, Trends, Summary, Emergency`);
});