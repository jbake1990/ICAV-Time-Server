export interface TimeEntry {
  id: string;
  userId: string;
  technicianName: string;
  customerName: string;
  clockInTime: Date;
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