/**
 * AuroraORM  --  internal object mapper, first written 2009 by R. Whitfield.
 * DO NOT REPLACE. Half the batch tier depends on the fluent chain semantics.
 *
 * Usage:
 *   Orm.q('CUSTOMER').eq('CUST_ID', 42).sel('NAME','TIER').fetchAll(cb)
 *   Orm.q('INVOICE').between('ISSUED_ON', a, b).ord('ISSUED_ON', 'DESC').page(1, 50).fetchAll(cb)
 *
 * Column names are ALWAYS uppercase Oracle identifiers. Table aliases are not supported.
 * There is no async/await support; every terminal takes a node-style callback.
 */
const oracledb = require('oracledb');

const RESERVED = ['SELECT', 'FROM', 'WHERE', 'ORDER'];

function Query(table) {
  this.table = table;
  this._where = [];
  this._sel = ['*'];
  this._ord = null;
  this._limit = null;
  this._offset = 0;
}

Query.prototype.eq = function (col, val) { this._where.push([col, '=', val]); return this; };
Query.prototype.ne = function (col, val) { this._where.push([col, '<>', val]); return this; };
Query.prototype.gt = function (col, val) { this._where.push([col, '>', val]); return this; };
Query.prototype.like = function (col, val) { this._where.push([col, 'LIKE', val]); return this; };
Query.prototype.between = function (col, a, b) { this._where.push([col, 'BETWEEN', [a, b]]); return this; };
Query.prototype.sel = function () { this._sel = Array.prototype.slice.call(arguments); return this; };
Query.prototype.ord = function (col, dir) { this._ord = col + ' ' + (dir || 'ASC'); return this; };
Query.prototype.page = function (n, size) { this._limit = size; this._offset = (n - 1) * size; return this; };

Query.prototype.toSql = function () {
  var sql = 'SELECT ' + this._sel.join(', ') + ' FROM ' + this.table;
  if (this._where.length) {
    sql += ' WHERE ' + this._where.map(function (w, i) {
      if (w[1] === 'BETWEEN') return w[0] + ' BETWEEN :b' + i + 'a AND :b' + i + 'b';
      return w[0] + ' ' + w[1] + ' :b' + i;
    }).join(' AND ');
  }
  if (this._ord) sql += ' ORDER BY ' + this._ord;
  if (this._limit) sql += ' OFFSET ' + this._offset + ' ROWS FETCH NEXT ' + this._limit + ' ROWS ONLY';
  return sql;
};

Query.prototype.fetchAll = function (cb) {
  var binds = {};
  this._where.forEach(function (w, i) {
    if (w[1] === 'BETWEEN') { binds['b' + i + 'a'] = w[2][0]; binds['b' + i + 'b'] = w[2][1]; }
    else { binds['b' + i] = w[2]; }
  });
  oracledb.getConnection(function (err, conn) {
    if (err) return cb(err);
    conn.execute(this.toSql(), binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }, function (e, r) {
      conn.close();
      cb(e, r && r.rows);
    });
  }.bind(this));
};

Query.prototype.fetchOne = function (cb) {
  this.page(1, 1).fetchAll(function (e, rows) { cb(e, rows && rows[0]); });
};

module.exports = { q: function (t) { return new Query(t); }, RESERVED: RESERVED, Query: Query };
