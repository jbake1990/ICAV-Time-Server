const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      console.log('Fixing password hashes...');

      // Generate correct password hashes
      const adminPasswordHash = await bcrypt.hash('admin123', 10);
      const techPasswordHash = await bcrypt.hash('tech123', 10);

      console.log('Generated admin hash:', adminPasswordHash);
      console.log('Generated tech hash:', techPasswordHash);

      // Update admin user password
      const adminResult = await sql`
        UPDATE users 
        SET password_hash = ${adminPasswordHash}
        WHERE username = 'admin'
        RETURNING username, display_name
      `;

      // Update tech users passwords
      const techResult = await sql`
        UPDATE users 
        SET password_hash = ${techPasswordHash}
        WHERE role = 'tech'
        RETURNING username, display_name
      `;

      // Test the admin password immediately
      const testResult = await bcrypt.compare('admin123', adminPasswordHash);
      
      res.status(200).json({
        success: true,
        message: 'Password hashes fixed successfully!',
        results: {
          adminUpdated: adminResult.rows,
          techUsersUpdated: techResult.rows,
          adminPasswordTest: testResult, // Should be true
          credentials: {
            admin: { username: 'admin', password: 'admin123' },
            tech: { username: 'john.doe', password: 'tech123' }
          }
        }
      });

    } catch (error) {
      console.error('Password fix error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }

  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}; 