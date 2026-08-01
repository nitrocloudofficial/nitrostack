export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  res.status(200).json({
    summary: {
      total: 0,
      safe: 0,
      danger: 0,
      needsAttention: 0,
      averageScore: 0
    },
    columns: {
      safe: [],
      danger: []
    },
    dangerThreshold: 55,
    profileSummary: 'System active — contract monitoring live.',
    disclaimer: 'Automated heuristic assessment.'
  });
}