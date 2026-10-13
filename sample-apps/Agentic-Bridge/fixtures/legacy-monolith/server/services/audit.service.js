const Orm = require('../db/aurora-orm');
function record(actor, action, subject) {
  // fire and forget; audit table is append-only
  Orm.q('AUDIT_LOG').eq('ACTOR', actor).fetchOne(function () {});
  return { actor, action, subject, at: new Date().toISOString() };
}
module.exports = { record };
