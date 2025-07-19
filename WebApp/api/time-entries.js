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
  console.log('Time entries API called with method:', req.method);
  
  // Add a simple debug endpoint for testing
  if (req.method === 'GET' && req.query.debug === 'true') {
    console.log('Debug endpoint called');
    return res.status(200).json({
      message: 'Debug endpoint working',
      timestamp: new Date().toISOString(),
      headers: req.headers,
      method: req.method,
      url: req.url
    });
  }
  
  // Add a test endpoint for iOS debugging
  if (req.method === 'POST' && req.query.test === 'true') {
    console.log('Test endpoint called');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', req.headers);
    return res.status(200).json({
      message: 'Test endpoint working',
      receivedData: req.body,
      timestamp: new Date().toISOString()
    });
  }
  
  if (req.method === 'GET') {
    try {
      console.log('Attempting to fetch time entries from database...');
      console.log('Request headers:', req.headers);
      
      // Verify user session and get user ID and role
      const userSession = await verifyUserSession(req.headers.authorization);
      const userId = userSession.user_id;
      const userRole = userSession.role;
      
      console.log('Authenticated user for GET:', {
        userId: userId,
        role: userRole,
        username: userSession.username,
        displayName: userSession.display_name
      });
      
      console.log('Fetching time entries for user ID:', userId, 'with role:', userRole);
      
      // Build the query based on user role
      let query;
      if (userRole === 'admin') {
        // Admins can see all time entries
        query = sql`
          SELECT 
            id,
            user_id,
            technician_name,
            customer_name,
            clock_in_time,
            clock_out_time,
            lunch_start_time,
            lunch_end_time,
            drive_start_time,
            drive_end_time,
            created_at,
            updated_at
          FROM time_entries 
          ORDER BY clock_in_time DESC
        `;
        console.log('Admin user - fetching all time entries');
      } else {
        // Regular users only see their own entries
        query = sql`
          SELECT 
            id,
            user_id,
            technician_name,
            customer_name,
            clock_in_time,
            clock_out_time,
            lunch_start_time,
            lunch_end_time,
            drive_start_time,
            drive_end_time,
            created_at,
            updated_at
          FROM time_entries 
          WHERE user_id = ${userId}
          ORDER BY clock_in_time DESC
        `;
        console.log('Regular user - fetching only user entries');
      }
      
      const { rows } = await query;

      console.log('Successfully fetched', rows.length, 'time entries');

      // Check if this is a web request (includes computed fields) or mobile request (basic fields only)
      const isWebRequest = req.query.format === 'web' || req.headers['user-agent']?.includes('Mozilla');
      
      if (isWebRequest) {
        // Format the data for web app with computed fields
        const formattedRows = rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          technicianName: row.technician_name,
          customerName: row.customer_name,
          clockInTime: row.clock_in_time ? new Date(row.clock_in_time).toISOString() : undefined,
          clockOutTime: row.clock_out_time ? new Date(row.clock_out_time).toISOString() : undefined,
          lunchStartTime: row.lunch_start_time ? new Date(row.lunch_start_time).toISOString() : undefined,
          lunchEndTime: row.lunch_end_time ? new Date(row.lunch_end_time).toISOString() : undefined,
          driveStartTime: row.drive_start_time ? new Date(row.drive_start_time).toISOString() : undefined,
          driveEndTime: row.drive_end_time ? new Date(row.drive_end_time).toISOString() : undefined,
          isActive: !row.clock_out_time && (row.clock_in_time || row.drive_start_time),
          isOnLunch: row.lunch_start_time && !row.lunch_end_time,
          isDriving: row.drive_start_time && !row.drive_end_time,
          duration: row.clock_out_time && row.clock_in_time ? 
            new Date(row.clock_out_time).getTime() - new Date(row.clock_in_time).getTime() : 
            undefined,
          formattedDuration: row.clock_out_time && row.clock_in_time ? 
            formatDuration(new Date(row.clock_out_time).getTime() - new Date(row.clock_in_time).getTime()) : 
            undefined,
          lunchDuration: row.lunch_start_time && row.lunch_end_time ? 
            new Date(row.lunch_end_time).getTime() - new Date(row.lunch_start_time).getTime() : 
            undefined,
          formattedLunchDuration: row.lunch_start_time && row.lunch_end_time ? 
            formatDuration(new Date(row.lunch_end_time).getTime() - new Date(row.lunch_start_time).getTime()) : 
            undefined,
          driveDuration: row.drive_start_time && row.drive_end_time ? 
            new Date(row.drive_end_time).getTime() - new Date(row.drive_start_time).getTime() : 
            undefined,
          formattedDriveDuration: row.drive_start_time && row.drive_end_time ? 
            formatDuration(new Date(row.drive_end_time).getTime() - new Date(row.drive_start_time).getTime()) : 
            undefined
        }));
        
        console.log('Returning web-formatted data for', formattedRows.length, 'entries');
        res.status(200).json(formattedRows);
      } else {
        // Format the data for mobile apps (basic TimeEntryResponse format)
        const formattedRows = rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          technicianName: row.technician_name,
          customerName: row.customer_name,
          clockInTime: row.clock_in_time ? new Date(row.clock_in_time).toISOString() : undefined,
          clockOutTime: row.clock_out_time ? new Date(row.clock_out_time).toISOString() : undefined,
          lunchStartTime: row.lunch_start_time ? new Date(row.lunch_start_time).toISOString() : undefined,
          lunchEndTime: row.lunch_end_time ? new Date(row.lunch_end_time).toISOString() : undefined,
          driveStartTime: row.drive_start_time ? new Date(row.drive_start_time).toISOString() : undefined,
          driveEndTime: row.drive_end_time ? new Date(row.drive_end_time).toISOString() : undefined
        }));
        
        console.log('Returning mobile-formatted data for', formattedRows.length, 'entries');
        res.status(200).json(formattedRows);
      }
    } catch (error) {
      console.error('Error fetching time entries:');
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
          error: 'Failed to fetch time entries',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  } else if (req.method === 'POST') {
    try {
      console.log('Creating new time entry with data:', req.body);
      console.log('Full request body:', JSON.stringify(req.body, null, 2));
      console.log('Request headers:', req.headers);
      
      // Verify user session and get user ID and role
      const userSession = await verifyUserSession(req.headers.authorization);
      const userId = userSession.user_id;
      const userRole = userSession.role;
      
      console.log('Authenticated user:', {
        userId: userId,
        role: userRole,
        username: userSession.username,
        displayName: userSession.display_name
      });
      
      console.log('Request body details:', {
        id: req.body.id,
        userId: req.body.userId,
        technicianName: req.body.technicianName,
        customerName: req.body.customerName,
        clockInTime: req.body.clockInTime,
        clockOutTime: req.body.clockOutTime,
        lunchStartTime: req.body.lunchStartTime,
        lunchEndTime: req.body.lunchEndTime,
        driveStartTime: req.body.driveStartTime,
        driveEndTime: req.body.driveEndTime
      });
      
      const { id, technicianName, customerName, clockInTime, clockOutTime, lunchStartTime, lunchEndTime, driveStartTime, driveEndTime } = req.body;

      // Determine the target user ID for the entry
      // Admins can specify any user ID, regular users can only use their own
      const targetUserId = userRole === 'admin' ? (req.body.userId || userId) : userId;
      
      console.log('Target user ID for entry:', targetUserId, '(requested by user:', userId, 'with role:', userRole, ')');
      console.log('Request body userId:', req.body.userId, 'vs authenticated userId:', userId);

      // Check for existing active entry for this user and customer
      // This prevents multiple active entries for the same job
      const { rows: activeEntries } = await sql`
        SELECT id, user_id FROM time_entries 
        WHERE user_id = ${targetUserId} 
          AND customer_name = ${customerName}
          AND (clock_out_time IS NULL OR drive_end_time IS NULL)
          AND id != ${id || '00000000-0000-0000-0000-000000000000'}
      `;
      
      console.log('Found active entries for same customer:', activeEntries.length);
      
      // If an ID is provided, try to update existing entry first
      if (id) {
        console.log('Attempting to update existing entry with ID:', id);
        
        // First, check if the entry exists and get its current user_id
        const { rows: existingRows } = await sql`
          SELECT user_id FROM time_entries WHERE id = ${id}
        `;
        
        if (existingRows.length === 0) {
          console.log('Entry with ID not found, checking for active entry to update instead');
          
          // If no entry with this ID exists, but we have an active entry for this customer,
          // update that entry instead of creating a new one
          if (activeEntries.length > 0) {
            const activeEntry = activeEntries[0];
            console.log('Updating active entry instead:', activeEntry.id);
            
            // Check if user can update this entry
            const canUpdate = userRole === 'admin' || activeEntry.user_id === userId;
            
            if (!canUpdate) {
              console.log('User not authorized to update this entry');
              return res.status(403).json({
                error: 'Not authorized to update this entry',
                details: 'Entry belongs to different user',
                timestamp: new Date().toISOString()
              });
            }
            
            // Update the active entry
            const { rows: updateRows } = await sql`
              UPDATE time_entries 
              SET 
                user_id = ${targetUserId},
                technician_name = ${technicianName},
                customer_name = ${customerName}, 
                clock_in_time = ${clockInTime},
                clock_out_time = ${clockOutTime},
                lunch_start_time = ${lunchStartTime},
                lunch_end_time = ${lunchEndTime},
                drive_start_time = ${driveStartTime},
                drive_end_time = ${driveEndTime},
                updated_at = NOW()
              WHERE id = ${activeEntry.id}
              RETURNING *
            `;

            console.log('Update query executed, rows affected:', updateRows.length);
            console.log('Update query result:', updateRows);

            if (updateRows.length > 0) {
              console.log('Successfully updated active time entry:', updateRows[0]);
              
              // Format the response to match iOS expectations
              const formattedResponse = {
                id: updateRows[0].id,
                userId: updateRows[0].user_id,
                technicianName: updateRows[0].technician_name,
                customerName: updateRows[0].customer_name,
                clockInTime: updateRows[0].clock_in_time,
                clockOutTime: updateRows[0].clock_out_time,
                lunchStartTime: updateRows[0].lunch_start_time,
                lunchEndTime: updateRows[0].lunch_end_time,
                driveStartTime: updateRows[0].drive_start_time,
                driveEndTime: updateRows[0].drive_end_time
              };
              
              console.log('Sending formatted response:', formattedResponse);
              return res.status(200).json(formattedResponse);
            }
          } else {
            console.log('No active entry found, will create new entry');
          }
        } else {
          const existingUserId = existingRows[0].user_id;
          console.log('Found existing entry with user_id:', existingUserId);
          
          // Check if user can update this entry
          const canUpdate = userRole === 'admin' || existingUserId === userId;
          
          if (!canUpdate) {
            console.log('User not authorized to update this entry');
            return res.status(403).json({
              error: 'Not authorized to update this entry',
              details: 'Entry belongs to different user',
              timestamp: new Date().toISOString()
            });
          }
          
          // Update the existing entry
          const { rows: updateRows } = await sql`
            UPDATE time_entries 
            SET 
              user_id = ${targetUserId},
              technician_name = ${technicianName},
              customer_name = ${customerName}, 
              clock_in_time = ${clockInTime},
              clock_out_time = ${clockOutTime},
              lunch_start_time = ${lunchStartTime},
              lunch_end_time = ${lunchEndTime},
              drive_start_time = ${driveStartTime},
              drive_end_time = ${driveEndTime},
              updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
          `;

          console.log('Update query executed, rows affected:', updateRows.length);
          console.log('Update query result:', updateRows);

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
              lunchEndTime: updateRows[0].lunch_end_time,
              driveStartTime: updateRows[0].drive_start_time,
              driveEndTime: updateRows[0].drive_end_time
            };
            
            console.log('Sending formatted response:', formattedResponse);
            return res.status(200).json(formattedResponse);
          } else {
            console.log('Update failed - no rows affected, creating new entry');
          }
        }
      } else {
        // No ID provided, check if there's an active entry for this customer
        if (activeEntries.length > 0) {
          console.log('Found active entry for same customer, updating instead of creating new');
          const activeEntry = activeEntries[0];
          
          // Check if user can update this entry
          const canUpdate = userRole === 'admin' || activeEntry.user_id === userId;
          
          if (!canUpdate) {
            console.log('User not authorized to update this entry');
            return res.status(403).json({
              error: 'Not authorized to update this entry',
              details: 'Entry belongs to different user',
              timestamp: new Date().toISOString()
            });
          }
          
          // Update the active entry
          const { rows: updateRows } = await sql`
            UPDATE time_entries 
            SET 
              user_id = ${targetUserId},
              technician_name = ${technicianName},
              customer_name = ${customerName}, 
              clock_in_time = ${clockInTime},
              clock_out_time = ${clockOutTime},
              lunch_start_time = ${lunchStartTime},
              lunch_end_time = ${lunchEndTime},
              drive_start_time = ${driveStartTime},
              drive_end_time = ${driveEndTime},
              updated_at = NOW()
            WHERE id = ${activeEntry.id}
            RETURNING *
          `;

          console.log('Update query executed, rows affected:', updateRows.length);
          console.log('Update query result:', updateRows);

          if (updateRows.length > 0) {
            console.log('Successfully updated active time entry:', updateRows[0]);
            
            // Format the response to match iOS expectations
            const formattedResponse = {
              id: updateRows[0].id,
              userId: updateRows[0].user_id,
              technicianName: updateRows[0].technician_name,
              customerName: updateRows[0].customer_name,
              clockInTime: updateRows[0].clock_in_time,
              clockOutTime: updateRows[0].clock_out_time,
              lunchStartTime: updateRows[0].lunch_start_time,
              lunchEndTime: updateRows[0].lunch_end_time,
              driveStartTime: updateRows[0].drive_start_time,
              driveEndTime: updateRows[0].drive_end_time
            };
            
            console.log('Sending formatted response:', formattedResponse);
            return res.status(200).json(formattedResponse);
          }
        }
      }

      // Create new entry (only if no active entry exists for this customer)
      console.log('Attempting to create new entry with values:', {
        targetUserId, 
        technicianName, 
        customerName, 
        clockInTime, 
        clockOutTime, 
        lunchStartTime, 
        lunchEndTime,
        driveStartTime,
        driveEndTime
      });
      
      // Validate required fields
      if (!targetUserId || !technicianName || !customerName) {
        console.error('Missing required fields:', { targetUserId, technicianName, customerName });
        return res.status(400).json({
          error: 'Missing required fields',
          details: 'userId, technicianName, and customerName are required',
          timestamp: new Date().toISOString()
        });
      }
      
      const { rows } = await sql`
        INSERT INTO time_entries (
          user_id, 
          technician_name, 
          customer_name, 
          clock_in_time, 
          clock_out_time, 
          lunch_start_time, 
          lunch_end_time,
          drive_start_time,
          drive_end_time
        ) 
        VALUES (
          ${targetUserId}, 
          ${technicianName}, 
          ${customerName}, 
          ${clockInTime}, 
          ${clockOutTime}, 
          ${lunchStartTime}, 
          ${lunchEndTime},
          ${driveStartTime},
          ${driveEndTime}
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
        lunchEndTime: rows[0].lunch_end_time,
        driveStartTime: rows[0].drive_start_time,
        driveEndTime: rows[0].drive_end_time
      };
      
      res.status(201).json(formattedResponse);
    } catch (error) {
      console.error('Error creating/updating time entry:');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error details:', error);
      console.error('Request body that caused error:', JSON.stringify(req.body, null, 2));
      console.error('User session that caused error:', {
        userId: userSession?.user_id,
        role: userSession?.role,
        username: userSession?.username
      });
      
      if (error.message.includes('No valid authorization header') || error.message.includes('Invalid or expired session')) {
        res.status(401).json({ 
          error: 'Authentication required',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to create/update time entry',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  } else if (req.method === 'DELETE') {
    try {
      console.log('Attempting to delete time entry');
      console.log('Request headers:', req.headers);
      console.log('Request URL:', req.url);
      console.log('Request method:', req.method);
      
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
      // Handle different URL formats: /api/time-entries/{id} or /api/time-entries/{id}/
      let entryId = null;
      
      // Method 1: Try to extract from URL path
      const urlParts = req.url.split('/');
      console.log('URL parts:', urlParts);
      
      // Look for the ID in the URL parts
      for (let i = urlParts.length - 1; i >= 0; i--) {
        const part = urlParts[i];
        // Check if this looks like a UUID
        if (part && part.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          entryId = part;
          break;
        }
      }
      
      // Method 2: If not found in URL, check query parameters
      if (!entryId && req.query && req.query.id) {
        entryId = req.query.id;
        console.log('Found ID in query parameters:', entryId);
      }
      
      // Method 3: If still not found, check request body
      if (!entryId && req.body && req.body.id) {
        entryId = req.body.id;
        console.log('Found ID in request body:', entryId);
      }
      
      if (!entryId) {
        console.error('No entry ID provided in URL, query params, or request body');
        console.error('URL:', req.url);
        console.error('Query params:', req.query);
        console.error('Request body:', req.body);
        return res.status(400).json({
          error: 'Entry ID required',
          details: 'No entry ID provided in URL, query parameters, or request body',
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
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

function formatDuration(durationMs) {
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
} 