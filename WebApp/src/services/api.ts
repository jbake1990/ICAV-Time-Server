// Use relative URLs in production (Vercel) and allow override in development
const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');

export interface ApiTimeEntry {
  id: string;
  userId: string;
  technicianName: string;
  customerName: string;
  clockInTime: string;
  clockOutTime?: string;
  lunchStartTime?: string;
  lunchEndTime?: string;
  isActive: boolean;
  isOnLunch: boolean;
  duration?: number;
  formattedDuration?: string;
  lunchDuration?: number;
  formattedLunchDuration?: string;
}

export interface ApiUser {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export const api = {
  // Time Entries
  async getTimeEntries(): Promise<ApiTimeEntry[]> {
    const url = `${API_BASE_URL}/api/time-entries`;
    console.log('Fetching time entries from:', url); // Debug log
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error('API response not ok:', response.status, response.statusText);
      throw new Error(`Failed to fetch time entries: ${response.status} ${response.statusText}`);
    }
    return response.json();
  },

  async createTimeEntry(data: {
    userId: string;
    technicianName: string;
    customerName: string;
    clockInTime: string;
    clockOutTime?: string;
    lunchStartTime?: string;
    lunchEndTime?: string;
  }): Promise<ApiTimeEntry> {
    const url = `${API_BASE_URL}/api/time-entries`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to create time entry: ${response.status} ${response.statusText}`);
    }
    return response.json();
  },

  // Users
  async getUsers(): Promise<ApiUser[]> {
    const url = `${API_BASE_URL}/api/users`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
    }
    return response.json();
  },

  async createUser(data: { username: string; displayName: string }): Promise<ApiUser> {
    const url = `${API_BASE_URL}/api/users`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to create user: ${response.status} ${response.statusText}`);
    }
    return response.json();
  },
}; 