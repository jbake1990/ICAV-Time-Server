# ICAV Time Tracker - Vercel + Neon Deployment Guide

This guide will walk you through deploying the ICAV Time Tracker web app to Vercel with a Neon PostgreSQL database, and connecting your iOS app.

## Prerequisites

1. **GitHub Account** - Your code needs to be on GitHub
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **Vercel CLI** (optional) - `npm i -g vercel`

**Note:** No separate Neon account needed - Vercel will handle the Neon setup automatically!

## Step 1: Push Code to GitHub

1. Create a new repository on GitHub
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Create React App
   - **Root Directory**: `WebApp`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`

### Option B: Deploy via CLI

```bash
cd WebApp
vercel
```

## Step 3: Set Up Neon PostgreSQL Database via Vercel

1. In your Vercel project dashboard, go to the "Storage" tab
2. Click "Create Database"
3. Select "Neon" from the database options
4. Click "Continue" to connect with Neon
5. If you don't have a Neon account, you'll be prompted to create one
6. Choose your database settings:
   - Database name (e.g., "icav-time-tracker")
   - Region (choose one close to your users)
7. Click "Create & Deploy"
8. Vercel will automatically create the database and set up environment variables

## Step 4: Initialize Database Schema

1. In your Vercel dashboard, click on your newly created Neon database
2. Click "Open in Neon Console" 
3. In the Neon console, go to "SQL Editor"
4. Copy and paste the contents of `Database/schema.sql`
5. Click "Run" to execute the schema
6. Verify tables are created in the "Tables" tab

## Step 5: Environment Variables (Auto-configured)

When you create the Neon database through Vercel, the following environment variables are automatically configured:
- `POSTGRES_URL` - Your database connection string
- `POSTGRES_PRISMA_URL` - Prisma-optimized connection string  
- `POSTGRES_URL_NON_POOLING` - Direct connection string

**No manual configuration needed!** ✅

## Step 6: Redeploy with Database

1. Go to your project's "Deployments" tab
2. Click "Redeploy" on your latest deployment
3. This will connect your API to the database

## Step 7: Test Your Deployment

1. Visit your deployed URL (e.g., `https://your-app.vercel.app`)
2. The web app should now be connected to the database
3. You should see the sample data from the schema

## Step 8: Connect iOS App

### Update iOS App Configuration

1. In your iOS project, update the API base URL to your Vercel deployment:
   ```swift
   // In your networking code
   let baseURL = "https://your-app.vercel.app"
   ```

2. Update your iOS app to use the new API endpoints:
   - `GET /api/time-entries` - Fetch all time entries
   - `POST /api/time-entries` - Create new time entry
   - `GET /api/users` - Fetch all users
   - `POST /api/users` - Create new user

### iOS API Integration Example

```swift
// Example API call in iOS
func fetchTimeEntries() async throws -> [TimeEntry] {
    guard let url = URL(string: "https://your-app.vercel.app/api/time-entries") else {
        throw NetworkError.invalidURL
    }
    
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode([TimeEntry].self, from: data)
}
```

## Step 9: Production Considerations

### Security
1. **CORS**: Configure CORS in your API functions if needed
2. **Authentication**: Add authentication to your API endpoints
3. **Rate Limiting**: Consider adding rate limiting for production

### Monitoring
1. Set up Vercel Analytics
2. Monitor database performance
3. Set up error tracking (e.g., Sentry)

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check environment variables are set correctly
   - Verify database is created and schema is applied

2. **API 500 Errors**
   - Check Vercel function logs in dashboard
   - Verify database schema matches API expectations

3. **CORS Issues**
   - Add CORS headers to your API functions if needed

### Getting Help

- Check Vercel documentation: [vercel.com/docs](https://vercel.com/docs)
- Check Neon documentation: [neon.tech/docs](https://neon.tech/docs)
- Check @vercel/postgres docs: [vercel.com/docs/storage/vercel-postgres](https://vercel.com/docs/storage/vercel-postgres)

## API Endpoints Reference

### Time Entries
- `GET /api/time-entries` - Get all time entries
- `POST /api/time-entries` - Create new time entry

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user

### Request/Response Format

**Time Entry POST Request:**
```json
{
  "userId": "uuid",
  "technicianName": "John Doe",
  "customerName": "ABC Company",
  "clockInTime": "2024-01-15T08:00:00Z",
  "clockOutTime": "2024-01-15T17:00:00Z",
  "lunchStartTime": "2024-01-15T12:00:00Z",
  "lunchEndTime": "2024-01-15T13:00:00Z"
}
```

**User POST Request:**
```json
{
  "username": "john.doe",
  "displayName": "John Doe"
}
```

## Next Steps

1. **Add Authentication**: Implement user login/logout
2. **Add Real-time Updates**: Use WebSockets or Server-Sent Events
3. **Add Export Functionality**: CSV/Excel export for time entries
4. **Add Analytics**: Dashboard with charts and insights
5. **Add Notifications**: Email/SMS alerts for unusual patterns

Your ICAV Time Tracker is now deployed and ready for production use! 🎉 