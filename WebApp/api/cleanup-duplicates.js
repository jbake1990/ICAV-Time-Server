const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Find and delete duplicate entries, keeping the most complete one
      const { rows: allEntries } = await sql`
        SELECT 
          id, technician_name, customer_name, clock_in_time, clock_out_time,
          lunch_start_time, lunch_end_time, created_at
        FROM time_entries 
        ORDER BY created_at DESC
      `;

      let deletedCount = 0;
      const groupedEntries = {};

      // Group entries by technician, customer, and clock-in time (rounded to minute)
      for (const entry of allEntries) {
        const clockInMinute = new Date(entry.clock_in_time);
        clockInMinute.setSeconds(0, 0); // Round to minute
        
        const key = `${entry.technician_name}-${entry.customer_name}-${clockInMinute.toISOString()}`;
        
        if (!groupedEntries[key]) {
          groupedEntries[key] = [];
        }
        groupedEntries[key].push(entry);
      }

      // For each group, keep the most complete entry and delete others
      for (const [key, entries] of Object.entries(groupedEntries)) {
        if (entries.length > 1) {
          // Sort by completeness: entries with clock_out are more complete
          entries.sort((a, b) => {
            const aComplete = (a.clock_out_time ? 1 : 0) + (a.lunch_start_time ? 0.5 : 0) + (a.lunch_end_time ? 0.5 : 0);
            const bComplete = (b.clock_out_time ? 1 : 0) + (b.lunch_start_time ? 0.5 : 0) + (b.lunch_end_time ? 0.5 : 0);
            return bComplete - aComplete; // Most complete first
          });

          const keepEntry = entries[0];
          const deleteEntries = entries.slice(1);

          // Delete the duplicates
          for (const deleteEntry of deleteEntries) {
            await sql`DELETE FROM time_entries WHERE id = ${deleteEntry.id}`;
            deletedCount++;
          }
        }
      }

      res.status(200).json({
        success: true,
        message: `Cleaned up ${deletedCount} duplicate entries`,
        deletedCount,
        remainingEntries: allEntries.length - deletedCount
      });

    } catch (error) {
      console.error('Cleanup error:', error);
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