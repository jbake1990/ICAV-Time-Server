const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    const { username, password } = req.body;

    try {
      // Test 1: Check database connection
      const { rows: timeTest } = await sql`SELECT NOW() as current_time`;
      
      // Test 2: Check if users table exists and has data
      const { rows: userCount } = await sql`SELECT COUNT(*) as count FROM users`;
      
      // Test 3: Check if the specific user exists
      const { rows: userCheck } = await sql`
        SELECT id, username, display_name, email, role, is_active, password_hash
        FROM users 
        WHERE username = ${username}
      `;
      
      // Test 4: If user exists, check password
      let passwordValid = false;
      if (userCheck.length > 0 && password) {
        passwordValid = await bcrypt.compare(password, userCheck[0].password_hash);
      }
      
      // Test 5: Check user_sessions table
      const { rows: sessionCount } = await sql`SELECT COUNT(*) as count FROM user_sessions`;

      res.status(200).json({
        debug: true,
        currentTime: timeTest[0].current_time,
        totalUsers: parseInt(userCount[0].count),
        userExists: userCheck.length > 0,
        userDetails: userCheck.length > 0 ? {
          id: userCheck[0].id,
          username: userCheck[0].username,
          displayName: userCheck[0].display_name,
          email: userCheck[0].email,
          role: userCheck[0].role,
          isActive: userCheck[0].is_active,
          hasPasswordHash: !!userCheck[0].password_hash
        } : null,
        passwordValid,
        totalSessions: parseInt(sessionCount[0].count),
        providedCredentials: { username, hasPassword: !!password }
      });

    } catch (error) {
      console.error('Debug auth error:', error);
      res.status(500).json({
        debug: true,
        error: error.message,
        stack: error.stack
      });
    }

  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}; 