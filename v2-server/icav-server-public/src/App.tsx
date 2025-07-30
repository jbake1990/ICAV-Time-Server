import React, { useState, useMemo, useEffect } from 'react';
import { Clock, Users, Settings, Download, X, UserPlus, Trash2, LogOut, UserCheck, Shield, FileText } from 'lucide-react';
import { TimeEntry, TimeEntryFilters, DashboardStats, User } from './types';
import { api } from './services/api';
import DashboardStatsComponent from './components/DashboardStats';
import TimeEntryFiltersComponent from './components/TimeEntryFilters';
import TimeEntryCard from './components/TimeEntryCard';
import { LoginForm } from './components/LoginForm';
import Reports from './components/Reports';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { formatDate, formatTime } from './utils/timeUtils';

function AppContent() {
  const { state: authState, login, logout, clearError } = useAuth();
  const [filters, setFilters] = useState<TimeEntryFilters>({});
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', displayName: '', password: '', role: 'tech' });
  const [creatingUser, setCreatingUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [clearingDatabase, setClearingDatabase] = useState(false);
  const [showClearDatabaseConfirm, setShowClearDatabaseConfirm] = useState(false);
  const [deletingEntry, setDeletingEntry] = useState<string | null>(null);

  // Clear time entries when user logs out
  useEffect(() => {
    if (!authState.isAuthenticated) {
      setTimeEntries([]);
      setUsers([]);
      setError(null);
    }
  }, [authState.isAuthenticated]);

  // Load time entries from API
  useEffect(() => {
    const loadTimeEntries = async () => {
      // Only load time entries if user is authenticated
      if (!authState.isAuthenticated) {
        console.log('User not authenticated, skipping time entries load');
        return;
      }
      
      try {
        setLoading(true);
        const apiEntries = await api.getTimeEntries();
        
        // Convert API data to frontend format
        const formattedEntries: TimeEntry[] = apiEntries.map(entry => ({
          ...entry,
          clockInTime: entry.clockInTime ? new Date(entry.clockInTime) : undefined,
          clockOutTime: entry.clockOutTime ? new Date(entry.clockOutTime) : undefined,
          lunchStartTime: entry.lunchStartTime ? new Date(entry.lunchStartTime) : undefined,
          lunchEndTime: entry.lunchEndTime ? new Date(entry.lunchEndTime) : undefined,
          driveStartTime: entry.driveStartTime ? new Date(entry.driveStartTime) : undefined,
          driveEndTime: entry.driveEndTime ? new Date(entry.driveEndTime) : undefined,
        }));
        
        console.log('API Response - Raw entries:', apiEntries);
        console.log('API Response - Formatted entries:', formattedEntries);
        console.log('Entries with drive time:', formattedEntries.filter(entry => entry.driveStartTime || entry.driveEndTime));
        
        setTimeEntries(formattedEntries);
        setError(null);
      } catch (err) {
        console.error('Failed to load time entries:', err);
        console.error('Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined,
          timestamp: new Date().toISOString()
        });
        setError('Failed to load time entries. Using sample data.');
        // Fallback to mock data if API fails
        const { mockTimeEntries } = await import('./data/mockData');
        setTimeEntries(mockTimeEntries);
      } finally {
        setLoading(false);
      }
    };

    loadTimeEntries();
  }, [authState.isAuthenticated]); // Add authState.isAuthenticated as dependency

  // Load users from API
  useEffect(() => {
    const loadUsers = async () => {
      // Only load users if user is authenticated
      if (!authState.isAuthenticated) {
        console.log('User not authenticated, skipping users load');
        return;
      }
      
      try {
        const apiUsers = await api.getUsers();
        const formattedUsers: User[] = apiUsers.map(user => ({
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: (user as any).role || 'tech' // Default to tech role if not provided
        }));
        setUsers(formattedUsers);
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    };

    loadUsers();
  }, [authState.isAuthenticated]); // Add authState.isAuthenticated as dependency

  // Filter time entries based on current filters
  const filteredEntries = useMemo(() => {
    let filtered = [...timeEntries];

    if (filters.technicianName) {
      filtered = filtered.filter(entry =>
        entry.technicianName.toLowerCase().includes(filters.technicianName!.toLowerCase())
      );
    }

    if (filters.customerName) {
      filtered = filtered.filter(entry =>
        entry.customerName.toLowerCase().includes(filters.customerName!.toLowerCase())
      );
    }

    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'active') {
        filtered = filtered.filter(entry => entry.isActive);
      } else if (filters.status === 'completed') {
        filtered = filtered.filter(entry => !entry.isActive);
      }
    }

    if (filters.dateRange) {
      filtered = filtered.filter(entry => {
        const entryDate = entry.clockInTime || entry.driveStartTime;
        if (!entryDate) return false;
        return entryDate >= filters.dateRange!.start && entryDate <= filters.dateRange!.end;
      });
    }

    return filtered.sort((a, b) => {
      const aDate = a.clockInTime || a.driveStartTime;
      const bDate = b.clockInTime || b.driveStartTime;
      if (!aDate || !bDate) return 0;
      return bDate.getTime() - aDate.getTime();
    });
  }, [filters, timeEntries]);

  // Calculate dashboard stats from real data
  const dashboardStats = useMemo((): DashboardStats => {
    const totalEntries = timeEntries.length;
    const activeEntries = timeEntries.filter(entry => entry.isActive).length;
    const totalHours = timeEntries
      .filter(entry => entry.duration)
      .reduce((sum, entry) => sum + (entry.duration || 0), 0) / (1000 * 60 * 60);
    const averageHoursPerDay = totalHours / Math.max(1, new Set(timeEntries.map(e => {
      const date = e.clockInTime || e.driveStartTime;
      return date ? date.toDateString() : 'unknown';
    }).filter(dateStr => dateStr !== 'unknown')).size);
    const techniciansWorking = new Set(timeEntries.filter(entry => entry.isActive).map(entry => entry.userId)).size;

    return {
      totalEntries,
      activeEntries,
      totalHours,
      averageHoursPerDay,
      techniciansWorking,
    };
  }, [timeEntries]);

  // Get unique technician and customer names for filters
  const technicianNames = useMemo(() => 
    [...new Set(timeEntries.map(entry => entry.technicianName))].sort(),
    [timeEntries]
  );

  const customerNames = useMemo(() => 
    [...new Set(timeEntries.map(entry => entry.customerName))].sort(),
    [timeEntries]
  );

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: { [key: string]: TimeEntry[] } = {};
    filteredEntries.forEach(entry => {
      const entryDate = entry.clockInTime || entry.driveStartTime;
      const dateKey = entryDate ? entryDate.toDateString() : 'Unknown';
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
    });
    return groups;
  }, [filteredEntries]);

  // CSV Export functionality
  const handleExport = () => {
    const csvHeaders = [
      'Date',
      'Technician Name',
      'Customer Name',
      'Clock In Time',
      'Clock Out Time',
      'Drive Start',
      'Drive End',
      'Lunch Start',
      'Lunch End',
      'Total Duration',
      'Drive Duration',
      'Lunch Duration',
      'Status'
    ];

    const csvData = filteredEntries.map(entry => [
      formatDate(entry.clockInTime || entry.driveStartTime || new Date()) || 'Unknown Date',
      entry.technicianName,
      entry.customerName,
      entry.clockInTime ? formatTime(entry.clockInTime) : 'N/A',
      entry.clockOutTime ? formatTime(entry.clockOutTime) : 'N/A',
      entry.driveStartTime ? formatTime(entry.driveStartTime) : 'N/A',
      entry.driveEndTime ? formatTime(entry.driveEndTime) : 'N/A',
      entry.lunchStartTime ? formatTime(entry.lunchStartTime) : 'N/A',
      entry.lunchEndTime ? formatTime(entry.lunchEndTime) : 'N/A',
      entry.formattedDuration || 'N/A',
      entry.formattedDriveDuration || 'N/A',
      entry.formattedLunchDuration || 'N/A',
      entry.isDriving ? 'Driving' : entry.isActive ? (entry.isOnLunch ? 'On Lunch' : 'Active') : 'Completed'
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `time_entries_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Create new user
  const handleCreateUser = async () => {
    if (!newUser.username.trim() || !newUser.displayName.trim() || !newUser.password.trim()) {
      alert('Please fill in username, display name, and password');
      return;
    }

    if (newUser.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      setCreatingUser(true);
      const createdUser = await api.createUser({
        username: newUser.username.trim(),
        displayName: newUser.displayName.trim(),
        password: newUser.password,
        role: newUser.role
      });
      
      setUsers(prev => [...prev, {
        id: createdUser.id,
        username: createdUser.username,
        displayName: createdUser.displayName,
        role: (createdUser as any).role || 'tech' // Default to tech role if not provided
      }]);
      
      setNewUser({ username: '', displayName: '', password: '', role: 'tech' });
      setShowCreateUser(false);
      alert('User created successfully!');
    } catch (err) {
      console.error('Failed to create user:', err);
      alert('Failed to create user. Please try again.');
    } finally {
      setCreatingUser(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      setDeletingUser(true);
      await api.deleteUser(userToDelete.id);
      
      // Remove user from local state
      setUsers(users.filter(u => u.id !== userToDelete.id));
      setUserToDelete(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
      setError('Failed to delete user. They may have existing time entries.');
    } finally {
      setDeletingUser(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      return;
    }
    
    setClearingDatabase(true);
    try {
      const result = await api.clearDatabase();
      alert(`Database cleared successfully. Deleted ${result.deletedCount} entries.`);
      setTimeEntries([]);
      setShowClearDatabaseConfirm(false);
    } catch (error) {
      console.error('Failed to clear database:', error);
      alert('Failed to clear database. Please try again.');
    } finally {
      setClearingDatabase(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm('Are you sure you want to delete this time entry? This action cannot be undone.')) {
      return;
    }
    
    setDeletingEntry(entryId);
    try {
      const result = await api.deleteTimeEntry(entryId);
      console.log('Entry deleted successfully:', result);
      
      // Remove the entry from the local state
      setTimeEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId));
      
      // If the deleted entry was selected, clear the selection
      if (selectedEntry?.id === entryId) {
        setSelectedEntry(null);
      }
      
      alert(`Entry for ${result.deletedEntry.customerName} deleted successfully.`);
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert('Failed to delete entry. Please try again.');
    } finally {
      setDeletingEntry(null);
    }
  };

  // Handle authentication loading
  if (authState.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 text-primary-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Checking authentication...</h2>
          <p className="text-gray-500">Please wait</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!authState.isAuthenticated) {
    return (
      <LoginForm
        onLogin={async (username, password) => {
          await login(username, password);
          clearError();
        }}
        isLoading={authState.isLoading}
        error={authState.error}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 text-primary-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
          <p className="text-gray-500">Fetching time entries from database</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Clock className="w-8 h-8 text-primary-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">ICAV Time Tracker</h1>
                <p className="text-sm text-gray-500">Office Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-sm">
                  {authState.user?.role === 'admin' ? (
                    <Shield className="w-4 h-4 text-orange-500" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-blue-500" />
                  )}
                  <span className="text-gray-700">{authState.user?.displayName}</span>
                  <span className="text-gray-500">
                    ({authState.user?.role === 'admin' ? 'Admin' : 'Tech'})
                  </span>
                </div>
              </div>

              {error && (
                <div className="text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-lg">
                  ⚠️ {error}
                </div>
              )}

              {/* Admin-only features */}
              {authState.user?.role === 'admin' && (
                <>
                  <button
                    onClick={() => setShowReports(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Reports</span>
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Logout Button */}
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Stats */}
        <DashboardStatsComponent stats={dashboardStats} />

        {/* Filters */}
        <TimeEntryFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          technicianNames={technicianNames}
          customerNames={customerNames}
        />

        {/* Results Summary */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Time Entries ({filteredEntries.length})
            </h2>
            <div className="text-sm text-gray-500">
              Showing {filteredEntries.length} of {timeEntries.length} entries
            </div>
          </div>
        </div>

        {/* Time Entries */}
        <div className="space-y-8">
          {Object.entries(groupedEntries).map(([dateKey, entries]) => (
            <div key={dateKey}>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {dateKey === 'Unknown' ? 'Unknown Date' : formatDate(new Date(dateKey))}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {entries.map((entry) => (
                  <TimeEntryCard
                    key={entry.id}
                    entry={entry}
                    onClick={() => setSelectedEntry(entry)}
                    onDelete={handleDeleteEntry}
                    isDeleting={deletingEntry === entry.id}
                  />
                ))}
              </div>
            </div>
          ))}

          {filteredEntries.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No time entries found</h3>
              <p className="text-gray-500">
                {timeEntries.length === 0 
                  ? "No time entries in database. Add some entries to get started."
                  : "Try adjusting your filters to see more results."
                }
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Settings Modal - Admin Only */}
      {showSettings && authState.user?.role === 'admin' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* User Management Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                  <button
                    onClick={() => setShowCreateUser(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add User</span>
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  {users.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No users found. Add your first user!</p>
                  ) : (
                    <div className="space-y-2">
                      {users.map(user => (
                        <div key={user.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                          <div>
                            <div className="flex items-center space-x-2">
                              <div className="font-medium text-gray-900">{user.displayName}</div>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                user.role === 'admin' 
                                  ? 'bg-orange-100 text-orange-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {user.role === 'admin' ? 'Admin' : 'Tech'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                            {user.email && (
                              <div className="text-sm text-gray-400">{user.email}</div>
                            )}
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-sm text-gray-400">ID: {user.id.slice(0, 8)}...</div>
                            <button
                              onClick={() => setUserToDelete(user)}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Export Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Data</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 mb-4">
                    Export filtered time entries to CSV format for analysis in Excel or other tools.
                  </p>
                  <button
                    onClick={() => {
                      handleExport();
                      setShowSettings(false);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Current View</span>
                  </button>
                </div>
              </div>

              {/* Database Management Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Management</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="mb-4">
                    <h4 className="text-md font-medium text-gray-900 mb-2">Clear Database</h4>
                    <p className="text-gray-600 mb-4">
                      Remove all time entries from the database. This action cannot be undone and will permanently delete all time tracking data.
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-red-800">
                        <strong>Warning:</strong> This will permanently delete all time entries. Make sure you have exported any important data before proceeding.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowClearDatabaseConfirm(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Clear All Time Entries</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Delete User</h2>
                <button
                  onClick={() => setUserToDelete(null)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={deletingUser}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Are you sure?</h3>
                    <p className="text-sm text-gray-500">This action cannot be undone.</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="font-medium text-gray-900">{userToDelete.displayName}</div>
                  <div className="text-sm text-gray-500">@{userToDelete.username}</div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Users with existing time entries cannot be deleted. 
                    This protects your data integrity.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setUserToDelete(null)}
                  disabled={deletingUser}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={deletingUser}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingUser ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Create New User</h2>
                <button
                  onClick={() => {
                    setShowCreateUser(false);
                    setNewUser({ username: '', displayName: '', password: '', role: 'tech' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="john.doe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Username should be lowercase with dots or underscores
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={newUser.displayName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Full name as it will appear in the interface
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave blank to use default password (username123)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="tech">Technician</option>
                    <option value="admin">Administrator</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Technicians can only view data, Admins can manage users and export data
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateUser(false);
                    setNewUser({ username: '', displayName: '', password: '', role: 'tech' });
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={creatingUser || !newUser.username || !newUser.displayName}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Database Confirmation Modal */}
      {showClearDatabaseConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Clear Database</h2>
                <button
                  onClick={() => setShowClearDatabaseConfirm(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={clearingDatabase}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Are you absolutely sure?</h3>
                    <p className="text-sm text-gray-500">This action cannot be undone.</p>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-800">
                    <strong>Warning:</strong> This will permanently delete ALL time entries from the database. 
                    This includes all clock in/out records, lunch breaks, and time tracking data.
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Recommendation:</strong> Export your data first to preserve any important records.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowClearDatabaseConfirm(false)}
                  disabled={clearingDatabase}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearDatabase}
                  disabled={clearingDatabase}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {clearingDatabase ? 'Clearing...' : 'Clear All Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Entry Details</h2>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <TimeEntryCard entry={selectedEntry} />
            </div>
          </div>
        </div>
      )}

      {/* Reports Modal */}
      {showReports && (
        <Reports
          timeEntries={timeEntries}
          onClose={() => setShowReports(false)}
        />
      )}
    </div>
  );
}

// Main App component with AuthProvider wrapper
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App; 