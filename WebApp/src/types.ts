export interface TimeEntry {
  id: string;
  userId: string;
  technicianName: string;
  customerName: string;
  clockInTime: Date;
  clockOutTime?: Date;
  lunchStartTime?: Date;
  lunchEndTime?: Date;
  isActive: boolean;
  isOnLunch: boolean;
  duration?: number;
  formattedDuration?: string;
  lunchDuration?: number;
  formattedLunchDuration?: string;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
}

export interface TimeEntryFilters {
  technicianName?: string;
  customerName?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: 'all' | 'active' | 'completed';
}

export interface DashboardStats {
  totalEntries: number;
  activeEntries: number;
  totalHours: number;
  averageHoursPerDay: number;
  techniciansWorking: number;
} 