const express = require('express');
const customers = require('../services/customer.service');
const { requireSession } = require('../middleware/auth');
const router = express.Router();
router.get('/customers', requireSession, (req, res) => {
  customers.findByTier(req.query.tier, Number(req.query.page || 1), (e, rows) => res.json({ customers: rows }));
});
module.exports = router;
