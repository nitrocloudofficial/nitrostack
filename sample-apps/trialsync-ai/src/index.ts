import express from 'express';
import cors from 'cors';
import Groq from 'groq-sdk';
import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { RootApp } from './app.module.js';

const GROQ_KEY = process.env.GROQ_API_KEY;
const groq = GROQ_KEY ? new Groq({ apiKey: GROQ_KEY }) : null;

async function bootstrap() {
  try {
    // Start NitroStack core engine
    const mcpApp = await McpApplicationFactory.create(RootApp);
    await mcpApp.start();

    // Create standalone Express bridge server
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Health check endpoint
    app.all(['/health', '/api/health'], (req, res) => {
      return res.json({ status: 'ok', mcp: 'active' });
    });

    // Doctor Copilot endpoint
    app.all(['/ask_copilot', '/api/ask_copilot'], async (req, res) => {
      const userQuery = req.body?.prompt || req.body?.query || 'explain protocol';
      const patientId = req.body?.patientId || 'P-101';

      if (!groq) {
        return res.status(500).json({ error: 'GROQ_API_KEY is missing in .env' });
      }

      try {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: 'You are a helpful clinical AI copilot assisting a physician.' },
            { role: 'user', content: `Patient ID ${patientId}: ${userQuery}` }
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.3,
        });

        const reply = completion.choices[0]?.message?.content || 'No response generated.';
        return res.json({ success: true, response: reply, text: reply });
      } catch (err: any) {
        console.error('Groq Error:', err.message);
        return res.status(500).json({ error: err.message });
      }
    });

    // NIH Trial Search endpoint
    app.all(['/search_clinical_trials', '/api/search_clinical_trials'], async (req, res) => {
      const condition = req.body?.condition || 'Cancer';
      const nihUrl = `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent(condition)}&pageSize=5`;

      try {
        const apiRes = await fetch(nihUrl);
        if (apiRes.ok) {
          const nihData: any = await apiRes.json();
          const studies = (nihData.studies || []).map((s: any) => ({
            NCT_ID: s.protocolSection?.identificationModule?.nctId || 'N/A',
            Title: s.protocolSection?.identificationModule?.briefTitle || 'Clinical Study',
            Phase: s.protocolSection?.designModule?.phases?.[0] || 'Phase N/A',
            Status: s.protocolSection?.statusModule?.overallStatus || 'RECRUITING',
            Location: s.protocolSection?.contactsLocationsModule?.locations?.[0]?.facility || 'Multiple Centers',
            Eligibility: (s.protocolSection?.eligibilityModule?.eligibilityCriteria || '').substring(0, 150) + '...'
          }));
          return res.json({ success: true, trials: studies });
        }
        return res.status(500).json({ error: 'NIH API response not OK' });
      } catch (err: any) {
        console.error('NIH API Error:', err.message);
        return res.status(500).json({ error: err.message });
      }
    });

    // Listen on port 3001
    const PORT = process.env.PORT || 3002;
    app.listen(PORT, () => {
      console.log(` NitroStack Bridge successfully running on port ${PORT}`);
    });
  } catch (error) {
    console.error(' Bootstrap failed:', error);
  }
}

bootstrap();