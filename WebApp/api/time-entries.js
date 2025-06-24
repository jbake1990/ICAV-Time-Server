import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
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
        ORDER BY clock_in_time DESC
      `;

      // Format the data to match the frontend expectations
      const formattedRows = rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        technicianName: row.technician_name,
        customerName: row.customer_name,
        clockInTime: new Date(row.clock_in_time),
        clockOutTime: row.clock_out_time ? new Date(row.clock_out_time) : undefined,
        lunchStartTime: row.lunch_start_time ? new Date(row.lunch_start_time) : undefined,
        lunchEndTime: row.lunch_end_time ? new Date(row.lunch_end_time) : undefined,
        isActive: !row.clock_out_time,
        isOnLunch: row.lunch_start_time && !row.lunch_end_time,
        duration: row.clock_out_time ? 
          new Date(row.clock_out_time).getTime() - new Date(row.clock_in_time).getTime() : 
          undefined,
        formattedDuration: row.clock_out_time ? 
          formatDuration(new Date(row.clock_out_time).getTime() - new Date(row.clock_in_time).getTime()) : 
          undefined,
        lunchDuration: row.lunch_start_time && row.lunch_end_time ? 
          new Date(row.lunch_end_time).getTime() - new Date(row.lunch_start_time).getTime() : 
          undefined,
        formattedLunchDuration: row.lunch_start_time && row.lunch_end_time ? 
          formatDuration(new Date(row.lunch_end_time).getTime() - new Date(row.lunch_start_time).getTime()) : 
          undefined
      }));

      res.status(200).json(formattedRows);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      res.status(500).json({ error: 'Failed to fetch time entries' });
    }
  } else if (req.method === 'POST') {
    try {
      const { userId, technicianName, customerName, clockInTime, clockOutTime, lunchStartTime, lunchEndTime } = req.body;

      const { rows } = await sql`
        INSERT INTO time_entries (
          user_id, 
          technician_name, 
          customer_name, 
          clock_in_time, 
          clock_out_time, 
          lunch_start_time, 
          lunch_end_time
        ) 
        VALUES (
          ${userId}, 
          ${technicianName}, 
          ${customerName}, 
          ${clockInTime}, 
          ${clockOutTime}, 
          ${lunchStartTime}, 
          ${lunchEndTime}
        )
        RETURNING *
      `;

      res.status(201).json(rows[0]);
    } catch (error) {
      console.error('Error creating time entry:', error);
      res.status(500).json({ error: 'Failed to create time entry' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

function formatDuration(durationMs) {
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
} 