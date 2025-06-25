const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      console.log('Starting database initialization...');

      // Enable UUID extension
      await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
      console.log('✅ UUID extension enabled');

      // Create user_role enum
      await sql`DROP TYPE IF EXISTS user_role CASCADE`;
      await sql`CREATE TYPE user_role AS ENUM ('tech', 'admin')`;
      console.log('✅ User role enum created');

      // Drop existing tables if they exist (in correct order due to foreign keys)
      await sql`DROP TABLE IF EXISTS user_sessions CASCADE`;
      await sql`DROP TABLE IF EXISTS time_entries CASCADE`;
      await sql`DROP TABLE IF EXISTS users CASCADE`;
      console.log('✅ Old tables dropped');

      // Create users table
      await sql`
        CREATE TABLE users (
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
        )
      `;
      console.log('✅ Users table created');

      // Create time_entries table
      await sql`
        CREATE TABLE time_entries (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          technician_name VARCHAR(100) NOT NULL,
          customer_name VARCHAR(100) NOT NULL,
          clock_in_time TIMESTAMPTZ NOT NULL,
          clock_out_time TIMESTAMPTZ,
          lunch_start_time TIMESTAMPTZ,
          lunch_end_time TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      console.log('✅ Time entries table created');

      // Create user_sessions table
      await sql`
        CREATE TABLE user_sessions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          session_token VARCHAR(255) NOT NULL UNIQUE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      console.log('✅ User sessions table created');

      // Create indexes
      await sql`CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in_time ON time_entries(clock_in_time)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_time_entries_technician_name ON time_entries(technician_name)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_time_entries_customer_name ON time_entries(customer_name)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`;
      console.log('✅ Indexes created');

      // Insert default admin user (password: admin123)
      await sql`
        INSERT INTO users (username, display_name, email, password_hash, role) VALUES 
        ('admin', 'System Administrator', 'admin@icav.com', '$2b$10$rOK0G7GbYhF6QM3xN8vQa.XfLt0K7ZBjYk8pN2mT5J6NG1K.EGBfC', 'admin')
        ON CONFLICT (username) DO NOTHING
      `;

      // Insert sample tech users (password: tech123 for all)
      await sql`
        INSERT INTO users (username, display_name, email, password_hash, role) VALUES 
        ('john.doe', 'John Doe', 'john@icav.com', '$2b$10$yHvTpQKrwGZ7F4L8P9rM8eK6jQ1N9LxJ5MgH0T3R6XB8uM7pZ.Qkm', 'tech'),
        ('jane.smith', 'Jane Smith', 'jane@icav.com', '$2b$10$yHvTpQKrwGZ7F4L8P9rM8eK6jQ1N9LxJ5MgH0T3R6XB8uM7pZ.Qkm', 'tech'),
        ('mike.johnson', 'Mike Johnson', 'mike@icav.com', '$2b$10$yHvTpQKrwGZ7F4L8P9rM8eK6jQ1N9LxJ5MgH0T3R6XB8uM7pZ.Qkm', 'tech'),
        ('sarah.wilson', 'Sarah Wilson', 'sarah@icav.com', '$2b$10$yHvTpQKrwGZ7F4L8P9rM8eK6jQ1N9LxJ5MgH0T3R6XB8uM7pZ.Qkm', 'tech'),
        ('david.brown', 'David Brown', 'david@icav.com', '$2b$10$yHvTpQKrwGZ7F4L8P9rM8eK6jQ1N9LxJ5MgH0T3R6XB8uM7pZ.Qkm', 'tech')
        ON CONFLICT (username) DO NOTHING
      `;
      console.log('✅ Default users created');

      res.status(200).json({
        success: true,
        message: 'Database initialized successfully!',
        details: {
          tablesCreated: ['users', 'time_entries', 'user_sessions'],
          indexesCreated: 8,
          defaultUsersCreated: 6,
          adminCredentials: { username: 'admin', password: 'admin123' },
          techCredentials: { username: 'john.doe', password: 'tech123' }
        }
      });

    } catch (error) {
      console.error('Database initialization error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }

  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}; 