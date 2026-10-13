const jwt = require('jsonwebtoken');
function requireSession(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    req.principal = jwt.verify(token, process.env.AURORA_JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'SESSION_INVALID' });
  }
}
module.exports = { requireSession };
