const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Delete all time entries
      const { rowCount } = await sql`DELETE FROM time_entries`;
      
      console.log(`Deleted ${rowCount} time entries from database`);

      res.status(200).json({
        success: true,
        message: `Database reset complete - deleted ${rowCount} time entries`,
        deletedCount: rowCount
      });

    } catch (error) {
      console.error('Database reset error:', error);
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