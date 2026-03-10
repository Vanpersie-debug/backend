const db = require('./db');

const tables = [
  'bar_products',
  'kitchen_products',
  'gym',
  'billiard',
  'expenses',
  'guesthouse',
  'credits',
  'employee_loans'
];

async function migrate() {
  console.log("🚀 Starting database migration: Adding is_locked column...");
  
  for (const table of tables) {
    try {
      console.log(`Checking table: ${table}`);
      
      // Check if column already exists
      const [columns] = await db.promise().query(`DESCRIBE ${table}`);
      const hasColumn = columns.some(c => c.Field === 'is_locked');
      
      if (!hasColumn) {
        console.log(`Adding is_locked to ${table}...`);
        await db.promise().query(`ALTER TABLE ${table} ADD COLUMN is_locked TINYINT DEFAULT 0`);
        console.log(`✅ Added is_locked to ${table}`);
      } else {
        console.log(`ℹ️ is_locked already exists in ${table}`);
      }
    } catch (error) {
      console.error(`❌ Error migrating table ${table}:`, error.message);
    }
  }
  
  console.log("✨ Migration completed.");
  db.end();
}

migrate();
