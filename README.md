# ICAV Time Tracker v2 Server

This is the v2 server for the ICAV Time Tracker application, featuring:

## New Features in v2
- ✅ Drive time tracking (drive_start_time, drive_end_time)
- ✅ Driving-only entries (clock_in_time can be NULL)
- ✅ DELETE functionality for time entries
- ✅ Enhanced API with better error handling
- ✅ Support for multiple clock in/outs per job

## Database Schema v2
The v2 schema includes:
- `drive_start_time` and `drive_end_time` columns
- `clock_in_time` is now nullable to support driving-only entries
- Additional indexes for drive time columns
- DELETE endpoint for time entries

## Deployment
1. Deploy to Vercel with PostgreSQL database
2. Run the schema_v2.sql to initialize the database
3. The API supports both web and mobile app clients

## API Endpoints
- `GET /api/time-entries` - Fetch time entries
- `POST /api/time-entries` - Create/update time entries
- `DELETE /api/time-entries/{id}` - Delete time entries
- `POST /api/auth` - Authentication
- `GET /api/users` - User management
- `GET /api/health` - Health check

## Development
This server is designed to work with the v2 iOS and Android apps.
