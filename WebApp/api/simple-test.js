export default async function handler(req, res) {
  try {
    console.log('Simple test function called');
    
    res.status(200).json({
      success: true,
      message: 'Simple function works!',
      timestamp: new Date().toISOString(),
      method: req.method,
      nodeVersion: process.version
    });
    
  } catch (error) {
    console.error('Simple test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
} 