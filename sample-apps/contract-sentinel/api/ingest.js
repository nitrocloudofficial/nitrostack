export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { title, counterparty, contractType, contractText, annualValue, currency, deadline } = req.body || {};

  const text = (contractText || '').toLowerCase();
  const isHighRisk = text.includes('unlimited') || text.includes('100%') || text.includes('penalty') || text.includes('breach');

  const newContract = {
    id: `cnt-${Date.now()}`,
    title: title || 'Untitled Contract',
    counterparty: counterparty || 'Unknown Counterparty',
    contractType: contractType || 'Agreement',
    annualValue: Number(annualValue) || 0,
    currency: currency || 'USD',
    deadline: deadline || '2026-12-30',
    riskScore: isHighRisk ? 85 : 25,
    classification: isHighRisk ? 'danger' : 'safe',
    summary: contractText || 'Contract successfully analyzed.'
  };

  res.status(200).json({
    success: true,
    message: 'Contract ingested successfully',
    contract: newContract
  });
}