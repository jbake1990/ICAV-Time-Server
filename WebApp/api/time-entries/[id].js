const { sql } = require('@vercel/postgres');

// Helper function to verify user session and get user ID
async function verifyUserSession(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid authorization header');
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  const { rows } = await sql`
    SELECT s.user_id, u.id, u.username, u.display_name, u.email, u.role
    FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.session_token = ${token} 
      AND s.expires_at > NOW()
      AND u.is_active = true
  `;
  
  if (rows.length === 0) {
    throw new Error('Invalid or expired session');
  }
  
  return rows[0];
}

module.exports = async function handler(req, res) {
  console.log('Time entry DELETE API called');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request headers:', req.headers);
  
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  
  try {
    console.log('Attempting to delete time entry');
    
    // Verify user session and get user ID and role
    const userSession = await verifyUserSession(req.headers.authorization);
    const userId = userSession.user_id;
    const userRole = userSession.role;
    
    console.log('Authenticated user for DELETE:', {
      userId: userId,
      role: userRole,
      username: userSession.username,
      displayName: userSession.display_name
    });
    
    // Extract the entry ID from the URL path
    // The ID should be in the URL path: /api/time-entries/{id}
    const urlParts = req.url.split('/');
    console.log('URL parts:', urlParts);
    
    // The ID should be the last part of the URL
    const entryId = urlParts[urlParts.length - 1];
    
    if (!entryId) {
      console.error('No entry ID provided in URL');
      return res.status(400).json({
        error: 'Entry ID required',
        details: 'No entry ID provided in URL',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('Attempting to delete entry with ID:', entryId);
    
    // First, check if the entry exists and get its user_id
    const { rows: existingRows } = await sql`
      SELECT user_id FROM time_entries WHERE id = ${entryId}
    `;
    
    if (existingRows.length === 0) {
      console.log('Entry not found with ID:', entryId);
      return res.status(404).json({
        error: 'Entry not found',
        details: `No time entry found with ID: ${entryId}`,
        timestamp: new Date().toISOString()
      });
    }
    
    const existingUserId = existingRows[0].user_id;
    console.log('Found entry with user_id:', existingUserId);
    
    // Check if user can delete this entry
    const canDelete = userRole === 'admin' || existingUserId === userId;
    
    if (!canDelete) {
      console.log('User not authorized to delete this entry');
      return res.status(403).json({
        error: 'Not authorized to delete this entry',
        details: 'Entry belongs to different user',
        timestamp: new Date().toISOString()
      });
    }
    
    // Delete the entry
    const { rowCount } = await sql`
      DELETE FROM time_entries WHERE id = ${entryId}
    `;
    
    console.log('Delete query executed, rows affected:', rowCount);
    
    if (rowCount > 0) {
      console.log('Successfully deleted time entry with ID:', entryId);
      return res.status(200).json({
        message: 'Time entry deleted successfully',
        deletedId: entryId,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('Delete failed - no rows affected');
      return res.status(500).json({
        error: 'Failed to delete time entry',
        details: 'No rows were affected by the delete operation',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error deleting time entry:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error);
    
    if (error.message.includes('No valid authorization header') || error.message.includes('Invalid or expired session')) {
      res.status(401).json({ 
        error: 'Authentication required',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to delete time entry',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}; 