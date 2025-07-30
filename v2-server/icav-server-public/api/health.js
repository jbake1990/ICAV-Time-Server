const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  try {
    // Test database connection
    const { rows } = await sql`SELECT NOW() as current_time`;
    
    // Get basic stats
    const userCount = await sql`SELECT COUNT(*) as count FROM users WHERE is_active = true`;
    const sessionCount = await sql`SELECT COUNT(*) as count FROM user_sessions WHERE expires_at > NOW()`;
    const entryCount = await sql`SELECT COUNT(*) as count FROM time_entries`;
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        currentTime: rows[0]?.current_time
      },
      stats: {
        activeUsers: userCount[0]?.count || 0,
        activeSessions: sessionCount[0]?.count || 0,
        totalEntries: entryCount[0]?.count || 0
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}; 