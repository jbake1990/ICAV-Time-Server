import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    console.log('Testing database connection...');
    
    // Simple query to test connection
    const { rows } = await sql`SELECT NOW() as current_time`;
    
    console.log('Database connection successful:', rows[0]);
    
    // Test if our tables exist
    const tableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log('Tables found:', tableCheck.rows);
    
    res.status(200).json({
      success: true,
      message: 'Database connection successful',
      current_time: rows[0].current_time,
      tables: tableCheck.rows.map(row => row.table_name)
    });
    
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      stack: error.stack
    });
  }
} 