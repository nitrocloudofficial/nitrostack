const oracledb = require('oracledb');
const CONFIG = require('../config/database.json');

let pool = null;

async function initPool() {
  if (pool) return pool;
  pool = await oracledb.createPool({
    user: CONFIG.user,
    password: process.env.ORACLE_PASSWORD,
    connectString: CONFIG.connectString,
    poolMin: 4,
    poolMax: 40
  });
  return pool;
}

module.exports = { initPool, getPool: () => pool };
