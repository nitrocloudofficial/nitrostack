const Orm = require('../db/aurora-orm');

function findByTier(tier, page, cb) {
  Orm.q('CUSTOMER').eq('TIER', tier).sel('CUST_ID', 'NAME', 'TIER').page(page, 50).fetchAll(cb);
}

function findById(custId, cb) {
  Orm.q('CUSTOMER').eq('CUST_ID', custId).fetchOne(cb);
}

module.exports = { findByTier, findById };
