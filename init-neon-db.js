const { sql } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');

async function initializeNeonDatabase() {
  try {
    console.log('🚀 Initializing ICAV Time Tracker database on Neon...');
    
    // Check if we have the required environment variables
    if (!process.env.POSTGRES_URL) {
      console.error('❌ POSTGRES_URL environment variable is not set');
      console.log('Please set your Neon database connection string in your environment variables');
      process.exit(1);
    }
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '../Database/schema_v2.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 60)}...`);
        try {
          await sql`${statement}`;
        } catch (error) {
          // Some statements might fail if they already exist (like extensions)
          if (error.message.includes('already exists')) {
            console.log(`  ⚠️  Statement already exists, skipping...`);
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('\n✅ Database initialized successfully on Neon!');
    console.log('\n📋 Default users created:');
    console.log('👤 admin (password: admin123) - Administrator');
    console.log('👤 john.doe (password: tech123) - Technician');
    console.log('👤 jane.smith (password: tech123) - Technician');
    console.log('👤 mike.johnson (password: tech123) - Technician');
    console.log('👤 sarah.wilson (password: tech123) - Technician');
    console.log('👤 david.brown (password: tech123) - Technician');
    
    console.log('\n🔐 Security Note: Change default passwords in production!');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    console.error('\nTroubleshooting tips:');
    console.error('1. Check your POSTGRES_URL environment variable');
    console.error('2. Ensure your Neon database is accessible');
    console.error('3. Verify your connection string format');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeNeonDatabase();
}

module.exports = { initializeNeonDatabase }; 