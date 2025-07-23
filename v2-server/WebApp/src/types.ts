export interface TimeEntry {
  id: string;
  userId: string;
  technicianName: string;
  customerName: string;
  clockInTime?: Date;
  clockOutTime?: Date;
  lunchStartTime?: Date;
  lunchEndTime?: Date;
  driveStartTime?: Date;
  driveEndTime?: Date;
  isActive: boolean;
  isOnLunch: boolean;
  isDriving: boolean;
  duration?: number;
  formattedDuration?: string;
  lunchDuration?: number;
  formattedLunchDuration?: string;
  driveDuration?: number;
  formattedDriveDuration?: string;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  role: 'tech' | 'admin';
  isActive?: boolean;
  lastLogin?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresAt: string;
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

// New types for reporting system
export type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom' | 'technician' | 'customer' | 'summary';

export interface ReportFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  technicianName?: string;
  customerName?: string;
  includeDriveTime?: boolean;
  includeLunchTime?: boolean;
  groupBy?: 'day' | 'week' | 'month' | 'technician' | 'customer';
}

export interface ReportData {
  type: ReportType;
  filters: ReportFilters;
  generatedAt: Date;
  summary: {
    totalEntries: number;
    totalHours: number;
    totalDriveHours: number;
    totalLunchHours: number;
    averageHoursPerDay: number;
    techniciansCount: number;
    customersCount: number;
  };
  entries: TimeEntry[];
  groupedData?: {
    [key: string]: {
      entries: TimeEntry[];
      totalHours: number;
      totalDriveHours: number;
      totalLunchHours: number;
      entryCount: number;
    };
  };
}

export interface TechnicianReport {
  technicianName: string;
  totalHours: number;
  totalDriveHours: number;
  totalLunchHours: number;
  entryCount: number;
  customers: string[];
  averageHoursPerDay: number;
  entries: TimeEntry[];
}

export interface CustomerReport {
  customerName: string;
  totalHours: number;
  totalDriveHours: number;
  totalLunchHours: number;
  entryCount: number;
  technicians: string[];
  averageHoursPerDay: number;
  entries: TimeEntry[];
} 