# ICAV Time Tracker - Office Dashboard

A modern web application for office workers to view and manage field technician time entries. This dashboard provides real-time insights into technician activities, time tracking, and project management.

## Features

- **Dashboard Overview**: Key metrics and statistics at a glance
- **Time Entry Management**: View and filter all technician time entries
- **Advanced Filtering**: Search by technician, customer, date range, and status
- **Real-time Status**: See which technicians are currently active or on lunch
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Export Functionality**: Export time data for reporting (coming soon)

## Tech Stack

- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework for styling
- **Lucide React** - Beautiful, customizable icons
- **date-fns** - Modern date utility library

## Project Structure

```
WebApp/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── DashboardStats.tsx
│   │   ├── TimeEntryCard.tsx
│   │   └── TimeEntryFilters.tsx
│   ├── data/
│   │   └── mockData.ts
│   ├── utils/
│   │   └── timeUtils.ts
│   ├── types.ts
│   ├── App.tsx
│   ├── index.tsx
│   └── index.css
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation

1. Navigate to the WebApp directory:
   ```bash
   cd WebApp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`

### Building for Production

To create a production build:

```bash
npm run build
```

The build files will be created in the `build` directory.

## Data Model

The application uses the same data structure as the iOS app:

### TimeEntry
- `id`: Unique identifier
- `userId`: Technician's user ID
- `technicianName`: Display name of the technician
- `customerName`: Name of the customer/job site
- `clockInTime`: When the technician clocked in
- `clockOutTime`: When the technician clocked out (optional)
- `lunchStartTime`: When lunch break started (optional)
- `lunchEndTime`: When lunch break ended (optional)
- `isActive`: Whether the entry is currently active
- `isOnLunch`: Whether the technician is currently on lunch
- `duration`: Total work duration in milliseconds
- `formattedDuration`: Human-readable duration (HH:MM)
- `lunchDuration`: Lunch break duration in milliseconds
- `formattedLunchDuration`: Human-readable lunch duration (HH:MM)

### User
- `id`: Unique user identifier
- `username`: Login username
- `displayName`: Full name for display

## Features in Detail

### Dashboard Statistics
- Total time entries
- Currently active entries
- Total hours worked
- Average hours per day
- Number of technicians currently working

### Filtering Options
- **Search**: Quick search across technician and customer names
- **Technician Filter**: Filter by specific technician
- **Customer Filter**: Filter by specific customer
- **Status Filter**: Show all, active only, or completed entries
- **Date Range**: Filter by specific date ranges with quick presets

### Time Entry Display
- **Card Layout**: Clean, organized display of each time entry
- **Status Indicators**: Visual indicators for active, completed, and lunch status
- **Detailed Information**: Clock in/out times, lunch breaks, and durations
- **Modal View**: Click any entry to see detailed information in a modal

## Future Enhancements

- **Real-time Updates**: WebSocket integration for live updates
- **Export Functionality**: CSV/Excel export of filtered data
- **Advanced Analytics**: Charts and graphs for time analysis
- **User Management**: Admin interface for managing technicians
- **Notifications**: Alerts for unusual time patterns
- **Mobile App**: Progressive Web App (PWA) capabilities

## Development

### Adding New Components

1. Create your component in the `src/components/` directory
2. Use TypeScript interfaces for props
3. Follow the existing naming conventions
4. Add proper TypeScript types

### Styling

The project uses Tailwind CSS for styling. Follow these guidelines:
- Use utility classes for styling
- Leverage the custom color palette defined in `tailwind.config.js`
- Maintain consistency with existing components
- Use responsive design principles

### State Management

Currently using React's built-in state management with hooks:
- `useState` for local component state
- `useMemo` for expensive calculations
- `useEffect` for side effects

For larger applications, consider adding Redux or Zustand.

## Contributing

1. Follow the existing code style and conventions
2. Add TypeScript types for all new features
3. Test your changes thoroughly
4. Update documentation as needed

## License

This project is part of the ICAV Time Tracker system. # Trigger new deployment
