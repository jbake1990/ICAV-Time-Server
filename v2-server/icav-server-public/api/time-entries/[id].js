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
    return res.status(405).json({
      error: 'Method not allowed',
      details: 'Only DELETE method is supported',
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    console.log('=== DELETE REQUEST DEBUG ===');
    console.log('Attempting to delete time entry');
    console.log('Request headers:', req.headers);
    console.log('Request URL:', req.url);
    console.log('Request method:', req.method);
    console.log('Request query:', req.query);
    console.log('Request params:', req.params);
    console.log('Request body:', req.body);
    console.log('=== END DELETE DEBUG ===');
    
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
    // Handle both /api/time-entries/123 and /api/time-entries/123/ formats
    let entryId = null;
    
    // Method 1: Try to extract from URL path
    const urlParts = req.url.split('/');
    if (urlParts.length > 0) {
      entryId = urlParts[urlParts.length - 1];
      // Remove any trailing slash or query parameters
      if (entryId && entryId.includes('?')) {
        entryId = entryId.split('?')[0];
      }
      // Also remove any trailing slash
      if (entryId && entryId.endsWith('/')) {
        entryId = entryId.slice(0, -1);
      }
      // Additional cleanup - remove any query parameters that might be attached
      if (entryId && entryId.includes('&')) {
        entryId = entryId.split('&')[0];
      }
      // Final aggressive cleanup - remove anything after the UUID pattern
      if (entryId) {
        const uuidMatch = entryId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if (uuidMatch) {
          entryId = uuidMatch[0];
        }
      }
    }
    
    // Method 2: If still no ID, try to extract from query parameters
    if (!entryId) {
      const url = new URL(req.url, `http://${req.headers.host}`);
      entryId = url.searchParams.get('id');
    }
    
    // Method 3: Try to extract from Vercel's dynamic route parameters
    if (!entryId && req.query && req.query.id) {
      entryId = req.query.id;
    }
    
    console.log('URL parsing - req.url:', req.url);
    console.log('URL parsing - urlParts:', urlParts);
    console.log('URL parsing - extracted entryId:', entryId);
    console.log('URL parsing - req.query:', req.query);
    console.log('URL parsing - entryId after cleanup:', entryId);
    console.log('URL parsing - entryId length:', entryId ? entryId.length : 'null');
    console.log('URL parsing - entryId includes ?:', entryId ? entryId.includes('?') : 'null');
    console.log('URL parsing - entryId includes &:', entryId ? entryId.includes('&') : 'null');
    
    if (!entryId) {
      console.error('No entry ID provided in URL');
      return res.status(400).json({
        error: 'Entry ID required',
        details: 'No entry ID provided in URL',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    console.log('UUID validation - entryId:', entryId);
    console.log('UUID validation - entryId type:', typeof entryId);
    console.log('UUID validation - entryId length:', entryId.length);
    console.log('UUID validation - regex test result:', uuidRegex.test(entryId));
    
    if (!uuidRegex.test(entryId)) {
      console.error('Invalid UUID format:', entryId);
      console.error('UUID validation failed for entryId:', entryId);
      console.error('UUID regex test result:', uuidRegex.test(entryId));
      return res.status(400).json({
        error: 'Invalid entry ID format',
        details: 'Entry ID must be a valid UUID',
        receivedId: entryId,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('UUID validation passed for entryId:', entryId);
    
    // Final cleanup - ensure no query parameters or extra characters
    if (entryId && entryId.includes('?')) {
      entryId = entryId.split('?')[0];
      console.log('URL parsing - entryId after final cleanup:', entryId);
    }
    
    // Final aggressive cleanup - extract only the UUID part
    if (entryId) {
      const uuidMatch = entryId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      if (uuidMatch) {
        entryId = uuidMatch[0];
        console.log('URL parsing - entryId after UUID extraction:', entryId);
      } else {
        console.error('No valid UUID found in entryId:', entryId);
      }
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
    console.log('Executing DELETE query for entryId:', entryId);
    console.log('DELETE query: DELETE FROM time_entries WHERE id = ${entryId}');
    
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
    console.error('=== DELETE ERROR DEBUG ===');
    console.error('Error deleting time entry:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error);
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error.constructor.name);
    console.error('=== END DELETE ERROR DEBUG ===');
    
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
}; // Force redeployment Wed Jul 23 10:15:23 EDT 2025
