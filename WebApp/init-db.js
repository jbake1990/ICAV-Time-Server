require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  try {
    console.log('Initializing ICAV Time Tracker database...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '../Database/schema_v2.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await sql`${statement}`;
      }
    }
    
    console.log('✅ Database initialized successfully!');
    console.log('\nDefault users created:');
    console.log('- admin (password: admin123)');
    console.log('- john.doe (password: tech123)');
    console.log('- jane.smith (password: tech123)');
    console.log('- mike.johnson (password: tech123)');
    console.log('- sarah.wilson (password: tech123)');
    console.log('- david.brown (password: tech123)');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase }; 