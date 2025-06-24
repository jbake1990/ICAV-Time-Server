import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { rows } = await sql`
        SELECT 
          te.id,
          te.user_id,
          te.technician_name,
          te.customer_name,
          te.clock_in_time,
          te.clock_out_time,
          te.lunch_start_time,
          te.lunch_end_time,
          te.created_at,
          te.updated_at,
          CASE 
            WHEN te.clock_out_time IS NULL THEN true 
            ELSE false 
          END as is_active,
          CASE 
            WHEN te.lunch_start_time IS NOT NULL AND te.lunch_end_time IS NULL THEN true 
            ELSE false 
          END as is_on_lunch,
          CASE 
            WHEN te.clock_out_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (te.clock_out_time - te.clock_in_time)) * 1000
            ELSE NULL 
          END as duration,
          CASE 
            WHEN te.lunch_start_time IS NOT NULL AND te.lunch_end_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (te.lunch_end_time - te.lunch_start_time)) * 1000
            ELSE NULL 
          END as lunch_duration
        FROM time_entries te
        ORDER BY te.clock_in_time DESC
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
        isActive: row.is_active,
        isOnLunch: row.is_on_lunch,
        duration: row.duration,
        formattedDuration: row.duration ? formatDuration(row.duration) : undefined,
        lunchDuration: row.lunch_duration,
        formattedLunchDuration: row.lunch_duration ? formatDuration(row.lunch_duration) : undefined
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
        INSERT INTO time_entries (user_id, technician_name, customer_name, clock_in_time, clock_out_time, lunch_start_time, lunch_end_time)
        VALUES (${userId}, ${technicianName}, ${customerName}, ${clockInTime}, ${clockOutTime}, ${lunchStartTime}, ${lunchEndTime})
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