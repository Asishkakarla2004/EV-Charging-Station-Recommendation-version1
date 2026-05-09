const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const db = new sqlite3.Database('./evcharging.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the SQLite database.');
});

// Run init.sql
const initSql = fs.readFileSync(path.join(__dirname, 'database', 'init.sql'), 'utf8');
db.exec(initSql, (err) => {
  if (err) {
    console.error('Error initializing database:', err.message);
  } else {
    console.log('Database initialized.');
  }
});

db.all('PRAGMA table_info(users)', [], (err, columns) => {
  if (err) {
    console.error('Error reading users table info:', err.message);
    return;
  }

  const hasBlockedColumn = columns.some((column) => column.name === 'is_blocked');
  if (hasBlockedColumn) {
    return;
  }

  db.run('ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT 0', (alterErr) => {
    if (alterErr) {
      console.error('Error adding users.is_blocked column:', alterErr.message);
      return;
    }
    console.log('Added users.is_blocked column.');
  });
});

module.exports = db;
