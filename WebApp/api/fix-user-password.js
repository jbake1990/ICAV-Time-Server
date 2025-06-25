const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { username, newPassword } = req.body;

      if (!username || !newPassword) {
        return res.status(400).json({ 
          success: false, 
          error: 'Username and newPassword are required' 
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ 
          success: false, 
          error: 'Password must be at least 6 characters long' 
        });
      }

      // Generate correct password hash
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update the user's password
      const result = await sql`
        UPDATE users 
        SET password_hash = ${passwordHash}, updated_at = NOW()
        WHERE username = ${username}
        RETURNING username, display_name
      `;

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
      }

      // Test the new password immediately
      const testResult = await bcrypt.compare(newPassword, passwordHash);
      
      res.status(200).json({
        success: true,
        message: `Password updated successfully for ${username}`,
        user: result.rows[0],
        passwordTest: testResult, // Should be true
        newCredentials: { username, password: newPassword }
      });

    } catch (error) {
      console.error('Fix user password error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }

  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}; 