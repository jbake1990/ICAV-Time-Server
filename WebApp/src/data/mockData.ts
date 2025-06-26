import { TimeEntry, User, DashboardStats } from '../types';

// Mock Users
export const mockUsers: User[] = [
  { id: '1', username: 'john.doe', displayName: 'John Doe', role: 'tech' },
  { id: '2', username: 'jane.smith', displayName: 'Jane Smith', role: 'tech' },
  { id: '3', username: 'mike.johnson', displayName: 'Mike Johnson', role: 'tech' },
  { id: '4', username: 'sarah.wilson', displayName: 'Sarah Wilson', role: 'tech' },
  { id: '5', username: 'david.brown', displayName: 'David Brown', role: 'tech' },
];

// Mock Time Entries
export const mockTimeEntries: TimeEntry[] = [
  {
    id: '1',
    userId: '1',
    technicianName: 'John Doe',
    customerName: 'ABC Manufacturing',
    clockInTime: new Date('2024-01-15T08:00:00'),
    clockOutTime: new Date('2024-01-15T17:00:00'),
    lunchStartTime: new Date('2024-01-15T12:00:00'),
    lunchEndTime: new Date('2024-01-15T13:00:00'),
    driveStartTime: new Date('2024-01-15T07:30:00'),
    driveEndTime: new Date('2024-01-15T08:00:00'),
    isActive: false,
    isOnLunch: false,
    isDriving: false,
    duration: 32400000, // 9 hours in milliseconds
    formattedDuration: '09:00',
    lunchDuration: 3600000, // 1 hour in milliseconds
    formattedLunchDuration: '01:00',
    driveDuration: 1800000, // 30 minutes in milliseconds
    formattedDriveDuration: '00:30',
  },
  {
    id: '2',
    userId: '2',
    technicianName: 'Jane Smith',
    customerName: 'XYZ Corporation',
    clockInTime: new Date('2024-01-15T07:30:00'),
    clockOutTime: undefined,
    lunchStartTime: new Date('2024-01-15T12:30:00'),
    lunchEndTime: undefined,
    driveStartTime: new Date('2024-01-15T07:00:00'),
    driveEndTime: new Date('2024-01-15T07:30:00'),
    isActive: true,
    isOnLunch: true,
    isDriving: false,
    duration: undefined,
    formattedDuration: undefined,
    lunchDuration: undefined,
    formattedLunchDuration: undefined,
    driveDuration: 1800000, // 30 minutes in milliseconds
    formattedDriveDuration: '00:30',
  },
  {
    id: '3',
    userId: '3',
    technicianName: 'Mike Johnson',
    customerName: 'Tech Solutions Inc',
    clockInTime: new Date('2024-01-15T09:00:00'),
    clockOutTime: undefined,
    lunchStartTime: undefined,
    lunchEndTime: undefined,
    driveStartTime: new Date('2024-01-15T08:15:00'),
    driveEndTime: new Date('2024-01-15T09:00:00'),
    isActive: true,
    isOnLunch: false,
    isDriving: false,
    duration: undefined,
    formattedDuration: undefined,
    lunchDuration: undefined,
    formattedLunchDuration: undefined,
    driveDuration: 2700000, // 45 minutes in milliseconds
    formattedDriveDuration: '00:45',
  },
  {
    id: '4',
    userId: '4',
    technicianName: 'Sarah Wilson',
    customerName: 'Global Industries',
    clockInTime: new Date('2024-01-14T08:15:00'),
    clockOutTime: new Date('2024-01-14T16:45:00'),
    lunchStartTime: new Date('2024-01-14T12:00:00'),
    lunchEndTime: new Date('2024-01-14T13:00:00'),
    driveStartTime: new Date('2024-01-14T07:45:00'),
    driveEndTime: new Date('2024-01-14T08:15:00'),
    isActive: false,
    isOnLunch: false,
    isDriving: false,
    duration: 30600000, // 8.5 hours in milliseconds
    formattedDuration: '08:30',
    lunchDuration: 3600000, // 1 hour in milliseconds
    formattedLunchDuration: '01:00',
    driveDuration: 1800000, // 30 minutes in milliseconds
    formattedDriveDuration: '00:30',
  },
  {
    id: '5',
    userId: '5',
    technicianName: 'David Brown',
    customerName: 'Innovation Labs',
    clockInTime: new Date('2024-01-15T06:00:00'),
    clockOutTime: new Date('2024-01-15T14:30:00'),
    lunchStartTime: new Date('2024-01-15T10:30:00'),
    lunchEndTime: new Date('2024-01-15T11:00:00'),
    driveStartTime: new Date('2024-01-15T05:15:00'),
    driveEndTime: new Date('2024-01-15T06:00:00'),
    isActive: false,
    isOnLunch: false,
    isDriving: false,
    duration: 30600000, // 8.5 hours in milliseconds
    formattedDuration: '08:30',
    lunchDuration: 1800000, // 30 minutes in milliseconds
    formattedLunchDuration: '00:30',
    driveDuration: 2700000, // 45 minutes in milliseconds
    formattedDriveDuration: '00:45',
  },
  {
    id: '6',
    userId: '1',
    technicianName: 'John Doe',
    customerName: 'ABC Manufacturing',
    clockInTime: new Date('2024-01-14T08:00:00'),
    clockOutTime: new Date('2024-01-14T17:00:00'),
    lunchStartTime: new Date('2024-01-14T12:00:00'),
    lunchEndTime: new Date('2024-01-14T13:00:00'),
    driveStartTime: new Date('2024-01-14T07:30:00'),
    driveEndTime: new Date('2024-01-14T08:00:00'),
    isActive: false,
    isOnLunch: false,
    isDriving: false,
    duration: 32400000, // 9 hours in milliseconds
    formattedDuration: '09:00',
    lunchDuration: 3600000, // 1 hour in milliseconds
    formattedLunchDuration: '01:00',
    driveDuration: 1800000, // 30 minutes in milliseconds
    formattedDriveDuration: '00:30',
  },
  {
    id: '7',
    userId: '2',
    technicianName: 'Jane Smith',
    customerName: 'XYZ Corporation',
    clockInTime: new Date('2024-01-14T07:30:00'),
    clockOutTime: new Date('2024-01-14T16:30:00'),
    lunchStartTime: new Date('2024-01-14T12:00:00'),
    lunchEndTime: new Date('2024-01-14T13:00:00'),
    driveStartTime: new Date('2024-01-14T07:00:00'),
    driveEndTime: new Date('2024-01-14T07:30:00'),
    isActive: false,
    isOnLunch: false,
    isDriving: false,
    duration: 32400000, // 9 hours in milliseconds
    formattedDuration: '09:00',
    lunchDuration: 3600000, // 1 hour in milliseconds
    formattedLunchDuration: '01:00',
    driveDuration: 1800000, // 30 minutes in milliseconds
    formattedDriveDuration: '00:30',
  },
];

// Calculate dashboard stats from mock data
export const calculateDashboardStats = (entries: TimeEntry[]): DashboardStats => {
  const totalEntries = entries.length;
  const activeEntries = entries.filter(entry => entry.isActive).length;
  const totalHours = entries
    .filter(entry => entry.duration)
    .reduce((sum, entry) => sum + (entry.duration || 0), 0) / (1000 * 60 * 60);
  const averageHoursPerDay = totalHours / Math.max(1, new Set(entries.map(e => {
    const date = e.clockInTime || e.driveStartTime;
    return date ? date.toDateString() : 'unknown';
  })).size);
  const techniciansWorking = new Set(entries.filter(entry => entry.isActive).map(entry => entry.userId)).size;

  return {
    totalEntries,
    activeEntries,
    totalHours,
    averageHoursPerDay,
    techniciansWorking,
  };
};

export const mockDashboardStats = calculateDashboardStats(mockTimeEntries); 