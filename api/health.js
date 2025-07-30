module.exports = async function handler(req, res) {
  // Very basic test to see if functions work at all
  try {
    res.status(200).json({
      status: 'basic_test_working',
      timestamp: new Date().toISOString(),
      message: 'Serverless function is executing',
      nodeVersion: process.version,
      env: {
        hasPostgresUrl: !!process.env.POSTGRES_URL,
        hasPostgresHost: !!process.env.POSTGRES_HOST,
        postgresUrlLength: process.env.POSTGRES_URL ? process.env.POSTGRES_URL.length : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'basic_test_failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}; 