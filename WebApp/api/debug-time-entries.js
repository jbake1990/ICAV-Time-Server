const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { rows } = await sql`
        SELECT 
          id,
          user_id,
          technician_name,
          customer_name,
          clock_in_time,
          clock_out_time,
          lunch_start_time,
          lunch_end_time,
          created_at,
          updated_at
        FROM time_entries 
        ORDER BY created_at DESC
      `;

      res.status(200).json({
        success: true,
        count: rows.length,
        entries: rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          technicianName: row.technician_name,
          customerName: row.customer_name,
          clockInTime: row.clock_in_time,
          clockOutTime: row.clock_out_time,
          lunchStartTime: row.lunch_start_time,
          lunchEndTime: row.lunch_end_time,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          isActive: !row.clock_out_time,
          isOnLunch: row.lunch_start_time && !row.lunch_end_time
        }))
      });

    } catch (error) {
      console.error('Debug time entries error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }

  } else if (req.method === 'DELETE') {
    try {
      // Reset database - delete ALL time entries for clean testing
      const { rowCount } = await sql`DELETE FROM time_entries`;
      
      res.status(200).json({
        success: true,
        message: `Database reset complete - deleted ${rowCount} time entries`,
        deletedCount: rowCount
      });

    } catch (error) {
      console.error('Error resetting database:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }

  } else if (req.method === 'PUT') {
    try {
      // Reset database - delete all time entries
      const { rowCount } = await sql`DELETE FROM time_entries`;
      
      res.status(200).json({
        success: true,
        message: `Database reset complete - deleted ${rowCount} time entries`,
        deletedCount: rowCount
      });

    } catch (error) {
      console.error('Error resetting database:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }

  } else {
    res.setHeader('Allow', ['GET', 'DELETE', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}; 