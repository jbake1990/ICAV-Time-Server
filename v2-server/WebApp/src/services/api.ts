// Use relative URLs in production (Vercel) and allow override in development
const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');

// Authentication helper functions
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('authToken', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('authToken');
};

const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export interface ApiTimeEntry {
  id: string;
  userId: string;
  technicianName: string;
  customerName: string;
  clockInTime: string;
  clockOutTime?: string;
  lunchStartTime?: string;
  lunchEndTime?: string;
  driveStartTime?: string;
  driveEndTime?: string;
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

export interface ApiUser {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export const api = {
  // Authentication
  async login(username: string, password: string): Promise<{ user: any; token: string; expiresAt: string }> {
    const url = `${API_BASE_URL}/api/auth`;
    console.log('Making login request to:', url);
    console.log('Login credentials:', { username, hasPassword: !!password });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'login', username, password }),
    });
    
    console.log('Login response status:', response.status);
    console.log('Login response headers:', response.headers);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Login failed' }));
      console.error('Login failed with error:', errorData);
      throw new Error(errorData.error || 'Login failed');
    }
    
    const responseData = await response.json();
    console.log('Login successful, response data:', responseData);
    return responseData;
  },

  async logout(): Promise<void> {
    const token = getAuthToken();
    if (token) {
      const url = `${API_BASE_URL}/api/auth`;
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'logout', sessionToken: token }),
      });
    }
    removeAuthToken();
  },

  async verifySession(): Promise<{ user: any; token: string; expiresAt: string }> {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No session token');
    }
    
    const url = `${API_BASE_URL}/api/auth`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'verify', sessionToken: token }),
    });
    
    if (!response.ok) {
      throw new Error('Session verification failed');
    }
    return response.json();
  },

  // Time Entries
  async getTimeEntries(): Promise<ApiTimeEntry[]> {
    const url = `${API_BASE_URL}/api/time-entries`;
    console.log('Fetching time entries from:', url); // Debug log
    
    const response = await fetch(url, {
      headers: {
        ...getAuthHeaders(),
      },
    });
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
    driveStartTime?: string;
    driveEndTime?: string;
  }): Promise<ApiTimeEntry> {
    const url = `${API_BASE_URL}/api/time-entries`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to create time entry: ${response.status} ${response.statusText}`);
    }
    return response.json();
  },

  async deleteTimeEntry(entryId: string): Promise<{ message: string; deletedEntry: { id: string; customerName: string; technicianName: string } }> {
    const url = `${API_BASE_URL}/api/time-entries/${entryId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Failed to delete time entry: ${response.status} ${response.statusText}`);
    }
    return response.json();
  },

  // Users
  async getUsers(): Promise<ApiUser[]> {
    const url = `${API_BASE_URL}/api/users`;
    const response = await fetch(url, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
    }
    return response.json();
  },

  async createUser(data: { username: string; displayName: string; password?: string; role?: string }): Promise<ApiUser> {
    const url = `${API_BASE_URL}/api/users`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to create user: ${response.status} ${response.statusText}`);
    }
    return response.json();
  },

  async deleteUser(userId: string): Promise<{ message: string; deletedUser: { id: string; username: string; displayName: string } }> {
    const url = `${API_BASE_URL}/api/users?userId=${encodeURIComponent(userId)}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Failed to delete user: ${response.status} ${response.statusText}`);
    }
    return response.json();
  },

  // Admin functions
  async clearDatabase(): Promise<{ success: boolean; message: string; deletedCount: number }> {
    const url = `${API_BASE_URL}/api/admin?action=reset-db`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Failed to clear database: ${response.status} ${response.statusText}`);
    }
    return response.json();
  },
}; 