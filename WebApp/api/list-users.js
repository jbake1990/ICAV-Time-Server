const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { rows } = await sql`
        SELECT id, username, display_name, email, role, is_active, created_at
        FROM users 
        ORDER BY created_at DESC
      `;

      res.status(200).json({
        success: true,
        users: rows,
        count: rows.length
      });

    } catch (error) {
      console.error('List users error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }

  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}; 