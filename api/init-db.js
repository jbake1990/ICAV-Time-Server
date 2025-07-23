const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Initializing ICAV Time Tracker database on Neon...');
    
    // Embedded schema statements
    const statements = [
      'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
      `CREATE TYPE user_role AS ENUM ('tech', 'admin')`,
      `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        role user_role NOT NULL DEFAULT 'tech',
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS time_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        technician_name VARCHAR(100) NOT NULL,
        customer_name VARCHAR(100) NOT NULL,
        clock_in_time TIMESTAMPTZ,
        clock_out_time TIMESTAMPTZ,
        lunch_start_time TIMESTAMPTZ,
        lunch_end_time TIMESTAMPTZ,
        drive_start_time TIMESTAMPTZ,
        drive_end_time TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      'CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in_time ON time_entries(clock_in_time)',
      'CREATE INDEX IF NOT EXISTS idx_time_entries_technician_name ON time_entries(technician_name)',
      'CREATE INDEX IF NOT EXISTS idx_time_entries_customer_name ON time_entries(customer_name)',
      'CREATE INDEX IF NOT EXISTS idx_time_entries_drive_start_time ON time_entries(drive_start_time)',
      'CREATE INDEX IF NOT EXISTS idx_time_entries_drive_end_time ON time_entries(drive_end_time)',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)',
      `INSERT INTO users (username, display_name, email, password_hash, role) VALUES 
        ('admin', 'System Administrator', 'admin@icav.com', '$2b$10$rOK0G7GbYhF6QM3xN8vQa.XfLt0K7ZBjYk8pN2mT5J6NG1K.EGBfC', 'admin')
        ON CONFLICT (username) DO NOTHING`,
      `INSERT INTO users (username, display_name, email, password_hash, role) VALUES 
        ('john.doe', 'John Doe', 'john@icav.com', '$2b$10$yHvTpQKrwGZ7F4L8P9rM8eK6jQ1N9LxJ5MgH0T3R6XB8uM7pZ.Qkm', 'tech'),
        ('jane.smith', 'Jane Smith', 'jane@icav.com', '$2b$10$yHvTpQKrwGZ7F4L8P9rM8eK6jQ1N9LxJ5MgH0T3R6XB8uM7pZ.Qkm', 'tech'),
        ('mike.johnson', 'Mike Johnson', 'mike@icav.com', '$2b$10$yHvTpQKrwGZ7F4L8P9rM8eK6jQ1N9LxJ5MgH0T3R6XB8uM7pZ.Qkm', 'tech'),
        ('sarah.wilson', 'Sarah Wilson', 'sarah@icav.com', '$2b$10$yHvTpQKrwGZ7F4L8P9rM8eK6jQ1N9LxJ5MgH0T3R6XB8uM7pZ.Qkm', 'tech'),
        ('david.brown', 'David Brown', 'david@icav.com', '$2b$10$yHvTpQKrwGZ7F4L8P9rM8eK6jQ1N9LxJ5MgH0T3R6XB8uM7pZ.Qkm', 'tech')
        ON CONFLICT (username) DO NOTHING`
    ];
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
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
    
    console.log('✅ Database initialized successfully on Neon!');
    
    res.status(200).json({ 
      success: true, 
      message: 'Database initialized successfully',
      usersCreated: [
        { username: 'admin', password: 'admin123', role: 'admin' },
        { username: 'john.doe', password: 'tech123', role: 'tech' },
        { username: 'jane.smith', password: 'tech123', role: 'tech' },
        { username: 'mike.johnson', password: 'tech123', role: 'tech' },
        { username: 'sarah.wilson', password: 'tech123', role: 'tech' },
        { username: 'david.brown', password: 'tech123', role: 'tech' }
      ]
    });
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    res.status(500).json({ 
      error: 'Failed to initialize database', 
      details: error.message 
    });
  }
} 