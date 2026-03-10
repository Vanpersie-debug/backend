const db = require('./db');
const tables = ['bar_products', 'kitchen_products', 'gym', 'billiard', 'expenses', 'guesthouse', 'credit'];

async function check() {
  for (const table of tables) {
    try {
      console.log(`--- Table: ${table} ---`);
      const [rows] = await db.promise().query(`DESCRIBE ${table}`);
      console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
      console.log(`Error checking ${table}: ${e.message}`);
    }
  }
  db.end();
}
check();
