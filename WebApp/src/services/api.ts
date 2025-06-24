const API_BASE_URL = process.env.REACT_APP_API_URL || '';

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
    const response = await fetch(`${API_BASE_URL}/api/time-entries`);
    if (!response.ok) {
      throw new Error('Failed to fetch time entries');
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
    const response = await fetch(`${API_BASE_URL}/api/time-entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create time entry');
    }
    return response.json();
  },

  // Users
  async getUsers(): Promise<ApiUser[]> {
    const response = await fetch(`${API_BASE_URL}/api/users`);
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    return response.json();
  },

  async createUser(data: { username: string; displayName: string }): Promise<ApiUser> {
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create user');
    }
    return response.json();
  },
}; 