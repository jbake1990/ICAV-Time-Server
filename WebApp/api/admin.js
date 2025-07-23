const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  const { action } = req.query;

  try {
    switch (action) {
      case 'debug-entries':
        return await debugTimeEntries(req, res);
      case 'reset-db':
        return await resetDatabase(req, res);
      case 'cleanup-duplicates':
        return await cleanupDuplicates(req, res);
      case 'list-users':
        return await listUsers(req, res);
      case 'fix-passwords':
        return await fixPasswords(req, res);
      case 'init-db':
        return await initDatabase(req, res);
      case 'test-db':
        return await testDatabase(req, res);
      case 'debug-auth':
        return await debugAuth(req, res);
      default:
        return res.status(400).json({
          error: 'Invalid action',
          availableActions: [
            'debug-entries', 'reset-db', 'cleanup-duplicates', 
            'list-users', 'fix-passwords', 'init-db', 'test-db', 'debug-auth'
          ]
        });
    }
  } catch (error) {
    console.error('Admin endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Debug time entries
async function debugTimeEntries(req, res) {
  if (req.method === 'GET') {
    const { rows } = await sql`
      SELECT * FROM time_entries ORDER BY created_at DESC
    `;

    res.status(200).json({
      success: true,
      count: rows.length,
      entries: rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        technicianName: row.technician_name,
        customerName: row.customer_name,
        clockInTime: row.clock_in_time,
        clockOutTime: row.clock_out_time,
        lunchStartTime: row.lunch_start_time,
        lunchEndTime: row.lunch_end_time,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isActive: !row.clock_out_time,
        isOnLunch: row.lunch_start_time && !row.lunch_end_time
      }))
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Reset database
async function resetDatabase(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rowCount } = await sql`DELETE FROM time_entries`;
  
  res.status(200).json({
    success: true,
    message: `Database reset complete - deleted ${rowCount} time entries`,
    deletedCount: rowCount
  });
}

// Cleanup duplicates
async function cleanupDuplicates(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rows: allEntries } = await sql`
    SELECT id, technician_name, customer_name, clock_in_time, clock_out_time, created_at
    FROM time_entries ORDER BY created_at ASC
  `;

  let deletedCount = 0;
  const groupedEntries = {};

  // Group by technician, customer, and clock-in time (rounded to minute)
  for (const entry of allEntries) {
    const clockInMinute = new Date(entry.clock_in_time);
    clockInMinute.setSeconds(0, 0);
    
    const key = `${entry.technician_name}-${entry.customer_name}-${clockInMinute.toISOString()}`;
    
    if (!groupedEntries[key]) {
      groupedEntries[key] = [];
    }
    groupedEntries[key].push(entry);
  }

  // Keep the most complete entry, delete others
  for (const entries of Object.values(groupedEntries)) {
    if (entries.length > 1) {
      entries.sort((a, b) => {
        const aComplete = !!a.clock_out_time;
        const bComplete = !!b.clock_out_time;
        
        if (aComplete && !bComplete) return -1;
        if (!aComplete && bComplete) return 1;
        
        return aComplete && bComplete 
          ? new Date(a.created_at) - new Date(b.created_at)
          : new Date(b.created_at) - new Date(a.created_at);
      });

      const deleteEntries = entries.slice(1);
      for (const deleteEntry of deleteEntries) {
        await sql`DELETE FROM time_entries WHERE id = ${deleteEntry.id}`;
        deletedCount++;
      }
    }
  }

  res.status(200).json({
    success: true,
    message: `Cleaned up ${deletedCount} duplicate entries`,
    deletedCount
  });
}

// List users
async function listUsers(req, res) {
  const { rows } = await sql`
    SELECT id, username, display_name, email, role, is_active, created_at, last_login
    FROM users ORDER BY created_at DESC
  `;

  res.status(200).json({
    success: true,
    count: rows.length,
    users: rows
  });
}

// Fix passwords
async function fixPasswords(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rows: users } = await sql`SELECT id, username, password_hash FROM users`;
  
  let fixedCount = 0;
  for (const user of users) {
    if (!user.password_hash || !user.password_hash.startsWith('$2')) {
      const defaultPassword = user.username === 'admin' ? 'admin123' : 'tech123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      await sql`
        UPDATE users 
        SET password_hash = ${hashedPassword} 
        WHERE id = ${user.id}
      `;
      
      fixedCount++;
    }
  }

  res.status(200).json({
    success: true,
    message: `Fixed ${fixedCount} user passwords`,
    fixedCount
  });
}

// Initialize database
async function initDatabase(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create tables and default users
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(50) UNIQUE NOT NULL,
      display_name VARCHAR(100) NOT NULL,
      email VARCHAR(100),
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'tech',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      last_login TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS time_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      technician_name VARCHAR(100) NOT NULL,
      customer_name VARCHAR(100) NOT NULL,
      clock_in_time TIMESTAMP NOT NULL,
      clock_out_time TIMESTAMP,
      lunch_start_time TIMESTAMP,
      lunch_end_time TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Create default admin user
  const adminHash = await bcrypt.hash('admin123', 10);
  await sql`
    INSERT INTO users (username, display_name, email, password_hash, role)
    VALUES ('admin', 'Administrator', 'admin@icav.com', ${adminHash}, 'admin')
    ON CONFLICT (username) DO NOTHING
  `;

  res.status(200).json({
    success: true,
    message: 'Database initialized successfully'
  });
}

// Test database connection
async function testDatabase(req, res) {
  const { rows: users } = await sql`SELECT COUNT(*) as count FROM users`;
  const { rows: entries } = await sql`SELECT COUNT(*) as count FROM time_entries`;

  res.status(200).json({
    success: true,
    database: 'connected',
    userCount: parseInt(users[0].count),
    entryCount: parseInt(entries[0].count)
  });
}

// Debug authentication
async function debugAuth(req, res) {
  const { rows: users } = await sql`
    SELECT username, display_name, role, is_active, 
           password_hash IS NOT NULL as has_password
    FROM users
  `;

  res.status(200).json({
    success: true,
    users,
    timestamp: new Date().toISOString()
  });
} 