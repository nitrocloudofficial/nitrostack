import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// In-memory contract store
let mockContracts: any[] = [];

// GET /api/contracts
app.get('/api/contracts', (_req, res) => {
  const safeContracts = mockContracts.filter(c => c.classification === 'safe');
  const dangerContracts = mockContracts.filter(c => c.classification === 'danger');
  const total = mockContracts.length;
  const averageScore = total 
    ? Math.round(mockContracts.reduce((acc, curr) => acc + (curr.riskScore || 0), 0) / total) 
    : 0;

  res.json({
    summary: {
      total,
      safe: safeContracts.length,
      danger: dangerContracts.length,
      needsAttention: 0,
      averageScore
    },
    columns: {
      safe: safeContracts,
      danger: dangerContracts
    },
    dangerThreshold: 55,
    profileSummary: 'System active — contract monitoring live.',
    disclaimer: 'Automated heuristic assessment.'
  });
});

// POST /api/ingest
app.post('/api/ingest', (req, res) => {
  const { title, counterparty, contractType, contractText, annualValue, currency, deadline } = req.body;

  const text = (contractText || '').toLowerCase();
  const isHighRisk = text.includes('unlimited') || text.includes('100%') || text.includes('18%') || text.includes('penalty') || text.includes('breach');
  const riskScore = isHighRisk ? 85 : 25;
  const classification = isHighRisk ? 'danger' : 'safe';

  const newContract = {
    id: `cnt-${Date.now()}`,
    title: title || 'Untitled Contract',
    counterparty: counterparty || 'Unknown Counterparty',
    contractType: contractType || 'Agreement',
    annualValue: Number(annualValue) || 0,
    currency: currency || 'USD',
    deadline: deadline || '2026-12-31',
    riskScore,
    classification,
    summary: contractText || 'Contract successfully ingested.'
  };

  mockContracts.push(newContract);

  res.json({
    success: true,
    message: 'Contract ingested successfully',
    contract: newContract
  });
});

// POST /api/cycle
app.post('/api/cycle', (_req, res) => {
  res.json({
    success: true,
    message: 'Sentinel cycle executed successfully',
    generatedAt: new Date().toISOString()
  });
});

// GET /api/health
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    server: 'Contract Sentinel Express REST API',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});