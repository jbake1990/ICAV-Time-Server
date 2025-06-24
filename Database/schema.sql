-- ICAV Time Tracker Database Schema
-- Compatible with Vercel PostgreSQL and other cloud providers

-- Enable UUID extension (required for gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in_time ON time_entries(clock_in_time);
CREATE INDEX IF NOT EXISTS idx_time_entries_technician_name ON time_entries(technician_name);
CREATE INDEX IF NOT EXISTS idx_time_entries_customer_name ON time_entries(customer_name);

-- Sample data for testing
INSERT INTO users (username, display_name) VALUES 
    ('john.doe', 'John Doe'),
    ('jane.smith', 'Jane Smith'),
    ('mike.johnson', 'Mike Johnson'),
    ('sarah.wilson', 'Sarah Wilson'),
    ('david.brown', 'David Brown')
ON CONFLICT (username) DO NOTHING; 