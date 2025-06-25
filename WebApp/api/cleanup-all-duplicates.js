const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Get all entries ordered by creation time
      const { rows: allEntries } = await sql`
        SELECT 
          id, technician_name, customer_name, clock_in_time, clock_out_time,
          lunch_start_time, lunch_end_time, created_at
        FROM time_entries 
        ORDER BY created_at ASC
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
          console.log(`Found ${entries.length} duplicates for ${key}`);
          
          // Sort by completeness: 
          // 1. Entries with clock_out are preferred
          // 2. Among complete entries, prefer the earliest created
          // 3. Among incomplete entries, prefer the latest created (most recent)
          entries.sort((a, b) => {
            const aComplete = !!a.clock_out_time;
            const bComplete = !!b.clock_out_time;
            
            if (aComplete && !bComplete) return -1; // a is complete, b is not
            if (!aComplete && bComplete) return 1;  // b is complete, a is not
            
            if (aComplete && bComplete) {
              // Both complete - prefer earlier created
              return new Date(a.created_at) - new Date(b.created_at);
            } else {
              // Both incomplete - prefer later created (most recent)
              return new Date(b.created_at) - new Date(a.created_at);
            }
          });

          const keepEntry = entries[0];
          const deleteEntries = entries.slice(1);

          console.log(`Keeping entry ${keepEntry.id} (${keepEntry.clock_out_time ? 'complete' : 'incomplete'})`);
          console.log(`Deleting ${deleteEntries.length} duplicates`);

          // Delete the duplicates
          for (const deleteEntry of deleteEntries) {
            await sql`DELETE FROM time_entries WHERE id = ${deleteEntry.id}`;
            deletedCount++;
            console.log(`Deleted entry ${deleteEntry.id}`);
          }
        }
      }

      res.status(200).json({
        success: true,
        message: `Cleaned up ${deletedCount} duplicate entries`,
        deletedCount,
        remainingEntries: allEntries.length - deletedCount,
        groupsProcessed: Object.keys(groupedEntries).length
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