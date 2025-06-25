const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { rows } = await sql`
        SELECT id, username, display_name, email, role, is_active, last_login, created_at, updated_at 
        FROM users 
        ORDER BY display_name
      `;

      const formattedRows = rows.map(row => ({
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        email: row.email,
        role: row.role,
        isActive: row.is_active,
        lastLogin: row.last_login,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      res.status(200).json(formattedRows);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  } else if (req.method === 'POST') {
    try {
      const { username, displayName, role = 'tech', password } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }
      
      // Hash the provided password
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 10);

      const { rows } = await sql`
        INSERT INTO users (username, display_name, role, password_hash) 
        VALUES (${username}, ${displayName}, ${role}, ${passwordHash})
        RETURNING *
      `;

      const newUser = rows[0];
      res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.display_name,
        role: newUser.role,
        createdAt: newUser.created_at,
        updatedAt: newUser.updated_at
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Check if user has any time entries
      const { rows: timeEntryCheck } = await sql`
        SELECT COUNT(*) as count FROM time_entries WHERE user_id = ${userId}
      `;

      const hasTimeEntries = parseInt(timeEntryCheck[0].count) > 0;

      if (hasTimeEntries) {
        return res.status(400).json({ 
          error: 'Cannot delete user with existing time entries',
          details: 'This user has time entries associated with them. Delete those entries first or contact support for data migration.'
        });
      }

      // Delete the user
      const { rows } = await sql`
        DELETE FROM users 
        WHERE id = ${userId}
        RETURNING *
      `;

      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({
        message: 'User deleted successfully',
        deletedUser: {
          id: rows[0].id,
          username: rows[0].username,
          displayName: rows[0].display_name
        }
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 