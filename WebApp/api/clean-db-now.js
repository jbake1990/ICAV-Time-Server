const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  try {
    // Delete all time entries regardless of method
    const { rowCount } = await sql`DELETE FROM time_entries`;
    
    console.log(`CLEAN-DB-NOW: Deleted ${rowCount} time entries from database`);

    res.status(200).json({
      success: true,
      message: `✅ Database cleaned! Deleted ${rowCount} time entries. Ready for fresh testing.`,
      deletedCount: rowCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('CLEAN-DB-NOW error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}; 