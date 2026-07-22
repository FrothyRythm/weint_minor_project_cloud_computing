// Database connection and initialization helper using sqlite3
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../cloud_storage.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  const schemaPath = path.resolve(__dirname, '../models/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema, (err) => {
    if (err) console.error('Database schema execution failed:', err);
  });
});

module.exports = db;
