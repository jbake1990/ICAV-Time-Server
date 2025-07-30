# ICAV Time Tracker v2 Server Deployment

## Vercel Deployment

### 1. Create New Vercel Project
- Go to Vercel dashboard
- Create new project from GitHub repository
- Connect to `jbake1990/icav-time-dev` repository
- Select the main branch

### 2. Environment Variables
Set these environment variables in Vercel:
```
POSTGRES_URL=your_postgres_connection_string
POSTGRES_HOST=your_postgres_host
POSTGRES_DATABASE=your_database_name
POSTGRES_USERNAME=your_username
POSTGRES_PASSWORD=your_password
```

### 3. Database Setup
1. Create a new PostgreSQL database (Vercel Postgres recommended)
2. Run the v2 schema:
   ```sql
   -- Use the schema_v2.sql file in Database/
   -- This includes drive time columns and nullable clock_in_time
   ```

### 4. API Endpoints
The v2 server includes these endpoints:
- `GET /api/time-entries` - Fetch time entries
- `POST /api/time-entries` - Create/update time entries  
- `DELETE /api/time-entries/{id}` - Delete time entries
- `POST /api/auth` - Authentication
- `GET /api/users` - User management
- `GET /api/health` - Health check

### 5. v2 Features
- ✅ Drive time tracking (drive_start_time, drive_end_time)
- ✅ Driving-only entries (clock_in_time can be NULL)
- ✅ DELETE functionality for time entries
- ✅ Enhanced error handling and logging
- ✅ Support for multiple clock in/outs per job

### 6. Testing
Test the deployment with:
- iOS app from ios-app branch
- Android app from android-app branch
- Web app (included in server)

## Migration from v1
If migrating from v1 to v2:
1. Backup existing data
2. Run migration: `migrate_drive_time.sql`
3. Deploy v2 server
4. Test thoroughly before production

## Production Deployment
When ready for production:
1. Merge server changes to production repository
2. Deploy to production Vercel project
3. Update app store listings
