const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  console.log('Time entries API called with method:', req.method);
  
  if (req.method === 'GET') {
    try {
      console.log('Attempting to fetch time entries from database...');
      
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

      console.log('Successfully fetched', rows.length, 'time entries');

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

      console.log('Returning formatted data for', formattedRows.length, 'entries');
      res.status(200).json(formattedRows);
    } catch (error) {
      console.error('Error fetching time entries:');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error details:', error);
      
      res.status(500).json({ 
        error: 'Failed to fetch time entries',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  } else if (req.method === 'POST') {
    try {
      console.log('Creating new time entry with data:', req.body);
      
      const { id, userId, technicianName, customerName, clockInTime, clockOutTime, lunchStartTime, lunchEndTime } = req.body;

      // If an ID is provided, try to update existing entry first
      if (id) {
        console.log('Attempting to update existing entry with ID:', id);
        
        const { rows: updateRows } = await sql`
          UPDATE time_entries 
          SET 
            user_id = ${userId},
            technician_name = ${technicianName},
            customer_name = ${customerName}, 
            clock_in_time = ${clockInTime},
            clock_out_time = ${clockOutTime},
            lunch_start_time = ${lunchStartTime},
            lunch_end_time = ${lunchEndTime},
            updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;

        if (updateRows.length > 0) {
          console.log('Successfully updated time entry:', updateRows[0]);
          
          // Format the response to match iOS expectations
          const formattedResponse = {
            id: updateRows[0].id,
            userId: updateRows[0].user_id,
            technicianName: updateRows[0].technician_name,
            customerName: updateRows[0].customer_name,
            clockInTime: updateRows[0].clock_in_time,
            clockOutTime: updateRows[0].clock_out_time,
            lunchStartTime: updateRows[0].lunch_start_time,
            lunchEndTime: updateRows[0].lunch_end_time
          };
          
          return res.status(200).json(formattedResponse);
        } else {
          console.log('Entry with ID not found, creating new entry');
        }
      }

      // Create new entry (either no ID provided or ID not found)
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

      console.log('Successfully created time entry:', rows[0]);
      
      // Format the response to match iOS expectations
      const formattedResponse = {
        id: rows[0].id,
        userId: rows[0].user_id,
        technicianName: rows[0].technician_name,
        customerName: rows[0].customer_name,
        clockInTime: rows[0].clock_in_time,
        clockOutTime: rows[0].clock_out_time,
        lunchStartTime: rows[0].lunch_start_time,
        lunchEndTime: rows[0].lunch_end_time
      };
      
      res.status(201).json(formattedResponse);
    } catch (error) {
      console.error('Error creating/updating time entry:');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      res.status(500).json({ 
        error: 'Failed to create/update time entry',
        details: error.message,
        timestamp: new Date().toISOString()
      });
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