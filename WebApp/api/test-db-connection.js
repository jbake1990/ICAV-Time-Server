const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Test basic database connection
      const { rows: timeTest } = await sql`SELECT NOW() as current_time`;
      
      // Check if users table exists and has data
      const { rows: userCount } = await sql`
        SELECT COUNT(*) as count FROM users
      `;
      
      // Check if admin user exists
      const { rows: adminUser } = await sql`
        SELECT username, display_name, role FROM users WHERE username = 'admin'
      `;
      
      // Check if user_sessions table exists
      const { rows: sessionCount } = await sql`
        SELECT COUNT(*) as count FROM user_sessions
      `;

      res.status(200).json({
        status: 'Connected',
        currentTime: timeTest[0].current_time,
        userCount: parseInt(userCount[0].count),
        adminUserExists: adminUser.length > 0,
        adminUser: adminUser[0] || null,
        sessionCount: parseInt(sessionCount[0].count),
        message: 'Database connection successful'
      });

    } catch (error) {
      console.error('Database test error:', error);
      res.status(500).json({
        status: 'Error',
        error: error.message,
        message: 'Database connection failed'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}; 