const db = require('./db');

db.query('DESCRIBE credits', (err, rows) => {
  if(err) console.error("credits table err:", err);
  else console.log("\n--- credits table info ---\n", rows);
  process.exit(0);
});
