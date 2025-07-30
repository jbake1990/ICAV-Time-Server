module.exports = async function handler(req, res) {
  try {
    // Try to import @vercel/postgres
    let sql;
    try {
      const { sql: importedSql } = require('@vercel/postgres');
      sql = importedSql;
    } catch (importError) {
      return res.status(500).json({
        status: 'import_failed',
        error: `Failed to import @vercel/postgres: ${importError.message}`,
        timestamp: new Date().toISOString()
      });
    }

    // Try to connect to database
    try {
      const { rows } = await sql`SELECT NOW() as current_time, 'connected' as status`;
      
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          currentTime: rows[0]?.current_time,
          testStatus: rows[0]?.status
        },
        env: {
          hasPostgresUrl: !!process.env.POSTGRES_URL,
          postgresUrlLength: process.env.POSTGRES_URL ? process.env.POSTGRES_URL.length : 0
        }
      });
    } catch (dbError) {
      res.status(500).json({
        status: 'db_connection_failed',
        error: dbError.message,
        timestamp: new Date().toISOString(),
        env: {
          hasPostgresUrl: !!process.env.POSTGRES_URL,
          postgresUrlLength: process.env.POSTGRES_URL ? process.env.POSTGRES_URL.length : 0
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'function_failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}; 