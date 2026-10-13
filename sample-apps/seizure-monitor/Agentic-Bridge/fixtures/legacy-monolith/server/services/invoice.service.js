const Orm = require('../db/aurora-orm');
const cache = require('../middleware/cache');
const audit = require('./audit.service');

function listInvoicesForCustomer(custId, from, to, cb) {
  const key = 'inv:' + custId + ':' + from + ':' + to;
  cache.get(key, function (hit) {
    if (hit) return cb(null, hit);
    Orm.q('INVOICE')
      .eq('CUST_ID', custId)
      .between('ISSUED_ON', from, to)
      .sel('INVOICE_ID', 'CUST_ID', 'AMOUNT_CENTS', 'ISSUED_ON', 'STATUS')
      .ord('ISSUED_ON', 'DESC')
      .fetchAll(function (err, rows) {
        if (err) return cb(err);
        cache.set(key, rows, 300);
        cb(null, rows);
      });
  });
}

function voidInvoice(invoiceId, actor, cb) {
  audit.record(actor, 'INVOICE_VOID', invoiceId);
  Orm.q('INVOICE').eq('INVOICE_ID', invoiceId).fetchOne(cb);
}

module.exports = { listInvoicesForCustomer, voidInvoice };
