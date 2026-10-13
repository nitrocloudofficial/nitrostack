/** Memcached wrapper. See ADR-014 - Redis was evaluated and rejected. */
const Memcached = require('memcached');
const client = new Memcached(process.env.MEMCACHED_HOSTS || 'cache-01.aurora.internal:11211');

function get(key, cb) { client.get(key, (err, data) => cb(err ? null : data)); }
function set(key, val, ttl) { client.set(key, val, ttl || 60, () => {}); }

module.exports = { get, set, client };
