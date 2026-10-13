const express = require('express');
const invoices = require('../services/invoice.service');
const { requireSession } = require('../middleware/auth');
const router = express.Router();

router.get('/customers/:id/invoices', requireSession, (req, res) => {
  invoices.listInvoicesForCustomer(req.params.id, req.query.from, req.query.to, (err, rows) => {
    if (err) return res.status(500).json({ error: 'ORM_FAILURE' });
    res.json({ invoices: rows });
  });
});

router.post('/invoices/:id/void', requireSession, (req, res) => {
  invoices.voidInvoice(req.params.id, req.principal.sub, (err, row) => {
    if (err) return res.status(500).json({ error: 'ORM_FAILURE' });
    res.json({ voided: row });
  });
});

module.exports = router;
