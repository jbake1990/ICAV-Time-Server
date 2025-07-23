const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  // Clean up expired sessions on every request
  try {
    await sql`
      DELETE FROM user_sessions 
      WHERE expires_at < NOW()
    `;
  } catch (error) {
    console.error('Session cleanup error:', error);
  }

  if (req.method === 'POST') {
    const { action, username, password, sessionToken } = req.body;

    if (action === 'login') {
      try {
        // Find user by username
        const { rows } = await sql`
          SELECT id, username, display_name, email, password_hash, role, is_active
          FROM users 
          WHERE username = ${username} AND is_active = true
        `;

        if (rows.length === 0) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = rows[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Generate session token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Store session
        await sql`
          INSERT INTO user_sessions (user_id, session_token, expires_at)
          VALUES (${user.id}, ${token}, ${expiresAt})
        `;

        // Update last login
        await sql`
          UPDATE users 
          SET last_login = NOW()
          WHERE id = ${user.id}
        `;

        // Return user data and token
        res.status(200).json({
          user: {
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            email: user.email,
            role: user.role
          },
          token,
          expiresAt
        });

      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
      }

    } else if (action === 'logout') {
      try {
        if (!sessionToken) {
          return res.status(400).json({ error: 'Session token required' });
        }

        // Delete session
        await sql`
          DELETE FROM user_sessions 
          WHERE session_token = ${sessionToken}
        `;

        res.status(200).json({ message: 'Logged out successfully' });

      } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
      }

    } else if (action === 'verify') {
      try {
        if (!sessionToken) {
          return res.status(401).json({ error: 'No session token provided' });
        }

        // Check if session exists and is valid
        const { rows } = await sql`
          SELECT s.*, u.id, u.username, u.display_name, u.email, u.role, u.is_active
          FROM user_sessions s
          JOIN users u ON s.user_id = u.id
          WHERE s.session_token = ${sessionToken} 
            AND s.expires_at > NOW()
            AND u.is_active = true
        `;

        if (rows.length === 0) {
          return res.status(401).json({ error: 'Invalid or expired session' });
        }

        const session = rows[0];

        // Return user data
        res.status(200).json({
          user: {
            id: session.id,
            username: session.username,
            displayName: session.display_name,
            email: session.email,
            role: session.role
          },
          token: sessionToken,
          expiresAt: session.expires_at
        });

      } catch (error) {
        console.error('Session verification error:', error);
        res.status(500).json({ error: 'Session verification failed' });
      }

    } else {
      res.status(400).json({ error: 'Invalid action' });
    }

  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}; 