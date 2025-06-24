-- ICAV Time Tracker Database Schema
-- Compatible with Vercel PostgreSQL and other cloud providers

-- Enable UUID extension (required for gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles enum
CREATE TYPE user_role AS ENUM ('tech', 'admin');

-- Users table
CREATE TABLE IF NOT EXISTS users (
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
);

-- Time Entries table
CREATE TABLE IF NOT EXISTS time_entries (
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
);

-- Session storage for authentication
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in_time ON time_entries(clock_in_time);
CREATE INDEX IF NOT EXISTS idx_time_entries_technician_name ON time_entries(technician_name);
CREATE INDEX IF NOT EXISTS idx_time_entries_customer_name ON time_entries(customer_name);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- Add default admin user (password: admin123)
-- Note: In production, change this password immediately!
INSERT INTO users (username, display_name, email, password_hash, role) VALUES 
    ('admin', 'System Administrator', 'admin@icav.com', '$2b$10$rOK0G7GbYhF6QM3xN8vQa.XfLt0K7ZBjYk8pN2mT5J6NG1K.EGBfC', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Sample tech users (password: tech123 for all)
INSERT INTO users (username, display_name, email, password_hash, role) VALUES 
    ('john.doe', 'John Doe', 'john@icav.com', '$2b$10$yHvTpQKrwGZ7F4L8P9rM8eK6jQ1N9LxJ5MgH0T3R6XB8uM7pZ.Qkm', 'tech'),
    ('jane.smith', 'Jane Smith', 'jane@icav.com', '$2b$10$yHvTpQKrwGZ7F4L8P9rM8eK6jQ1N9LxJ5MgH0T3R6XB8uM7pZ.Qkm', 'tech'),
    ('mike.johnson', 'Mike Johnson', 'mike@icav.com', '$2b$10$yHvTpQKrwGZ7F4L8P9rM8eK6jQ1N9LxJ5MgH0T3R6XB8uM7pZ.Qkm', 'tech'),
    ('sarah.wilson', 'Sarah Wilson', 'sarah@icav.com', '$2b$10$yHvTpQKrwGZ7F4L8P9rM8eK6jQ1N9LxJ5MgH0T3R6XB8uM7pZ.Qkm', 'tech'),
    ('david.brown', 'David Brown', 'david@icav.com', '$2b$10$yHvTpQKrwGZ7F4L8P9rM8eK6jQ1N9LxJ5MgH0T3R6XB8uM7pZ.Qkm', 'tech')
ON CONFLICT (username) DO NOTHING; 