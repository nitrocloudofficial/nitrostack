const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database.sqlite');

db.serialize(() => {
  // Migrate tasks table - add created_at if not present
  db.run("ALTER TABLE tasks ADD COLUMN created_at TEXT", (err) => {
    if (err) console.log('tasks created_at:', err.message.includes('duplicate') ? 'already exists' : err.message);
    else console.log('tasks: created_at column added');
  });

  // Backfill null values
  db.run("UPDATE tasks SET created_at = datetime('now','localtime') WHERE created_at IS NULL", (err) => {
    if (err) console.error('backfill tasks:', err.message);
    else console.log('tasks: rows backfilled');
  });

  // Show all tables and their columns
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) return console.error(err.message);
    console.log('Tables:', rows.map(r => r.name));
  });

  // Show tasks rows
  db.all("SELECT * FROM tasks", (err, rows) => {
    if (err) return console.error(err.message);
    console.log('Tasks rows:', JSON.stringify(rows, null, 2));
  });
});

setTimeout(() => { db.close(); console.log('Done.'); }, 3000);
