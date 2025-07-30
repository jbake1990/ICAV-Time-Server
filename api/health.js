const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  try {
    // Test basic database connection first
    const { rows } = await sql`SELECT NOW() as current_time`;
    
    let stats = {
      activeUsers: 0,
      activeSessions: 0,
      totalEntries: 0
    };
    
    // Try to get stats, but don't fail if tables don't exist
    try {
      const userCount = await sql`SELECT COUNT(*) as count FROM users WHERE is_active = true`;
      const sessionCount = await sql`SELECT COUNT(*) as count FROM user_sessions WHERE expires_at > NOW()`;
      const entryCount = await sql`SELECT COUNT(*) as count FROM time_entries`;
      
      stats = {
        activeUsers: userCount.rows[0]?.count || 0,
        activeSessions: sessionCount.rows[0]?.count || 0,
        totalEntries: entryCount.rows[0]?.count || 0
      };
    } catch (tableError) {
      console.log('Tables may not exist yet:', tableError.message);
      stats.tablesExist = false;
      stats.error = tableError.message;
    }
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        currentTime: rows[0]?.current_time
      },
      stats
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