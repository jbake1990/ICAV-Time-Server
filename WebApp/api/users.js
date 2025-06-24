import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { rows } = await sql`
        SELECT id, username, display_name, created_at, updated_at 
        FROM users 
        ORDER BY display_name
      `;

      const formattedRows = rows.map(row => ({
        id: row.id,
        username: row.username,
        displayName: row.display_name,
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
      const { username, displayName } = req.body;

      const { rows } = await sql`
        INSERT INTO users (username, display_name) 
        VALUES (${username}, ${displayName})
        RETURNING *
      `;

      const newUser = rows[0];
      res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.display_name,
        createdAt: newUser.created_at,
        updatedAt: newUser.updated_at
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 