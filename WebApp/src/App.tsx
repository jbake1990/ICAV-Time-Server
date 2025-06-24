import React, { useState, useMemo, useEffect } from 'react';
import { Clock, Users, Settings, Download, X, UserPlus } from 'lucide-react';
import { TimeEntry, TimeEntryFilters, DashboardStats, User } from './types';
import { api } from './services/api';
import DashboardStatsComponent from './components/DashboardStats';
import TimeEntryFiltersComponent from './components/TimeEntryFilters';
import TimeEntryCard from './components/TimeEntryCard';
import { formatDate, formatTime } from './utils/timeUtils';

function App() {
  const [filters, setFilters] = useState<TimeEntryFilters>({});
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', displayName: '' });
  const [creatingUser, setCreatingUser] = useState(false);

  // Load time entries from API
  useEffect(() => {
    const loadTimeEntries = async () => {
      try {
        setLoading(true);
        const apiEntries = await api.getTimeEntries();
        
        // Convert API data to frontend format
        const formattedEntries: TimeEntry[] = apiEntries.map(entry => ({
          ...entry,
          clockInTime: new Date(entry.clockInTime),
          clockOutTime: entry.clockOutTime ? new Date(entry.clockOutTime) : undefined,
          lunchStartTime: entry.lunchStartTime ? new Date(entry.lunchStartTime) : undefined,
          lunchEndTime: entry.lunchEndTime ? new Date(entry.lunchEndTime) : undefined,
        }));
        
        setTimeEntries(formattedEntries);
        setError(null);
      } catch (err) {
        console.error('Failed to load time entries:', err);
        setError('Failed to load time entries. Using sample data.');
        // Fallback to mock data if API fails
        const { mockTimeEntries } = await import('./data/mockData');
        setTimeEntries(mockTimeEntries);
      } finally {
        setLoading(false);
      }
    };

    loadTimeEntries();
  }, []);

  // Load users from API
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const apiUsers = await api.getUsers();
        const formattedUsers: User[] = apiUsers.map(user => ({
          id: user.id,
          username: user.username,
          displayName: user.displayName
        }));
        setUsers(formattedUsers);
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    };

    loadUsers();
  }, []);

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
        const entryDate = entry.clockInTime;
        return entryDate >= filters.dateRange!.start && entryDate <= filters.dateRange!.end;
      });
    }

    return filtered.sort((a, b) => b.clockInTime.getTime() - a.clockInTime.getTime());
  }, [filters, timeEntries]);

  // Calculate dashboard stats from real data
  const dashboardStats = useMemo((): DashboardStats => {
    const totalEntries = timeEntries.length;
    const activeEntries = timeEntries.filter(entry => entry.isActive).length;
    const totalHours = timeEntries
      .filter(entry => entry.duration)
      .reduce((sum, entry) => sum + (entry.duration || 0), 0) / (1000 * 60 * 60);
    const averageHoursPerDay = totalHours / Math.max(1, new Set(timeEntries.map(e => e.clockInTime.toDateString())).size);
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
      const dateKey = entry.clockInTime.toDateString();
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
      'Lunch Start',
      'Lunch End',
      'Total Duration',
      'Lunch Duration',
      'Status'
    ];

    const csvData = filteredEntries.map(entry => [
      formatDate(entry.clockInTime),
      entry.technicianName,
      entry.customerName,
      formatTime(entry.clockInTime),
      entry.clockOutTime ? formatTime(entry.clockOutTime) : 'N/A',
      entry.lunchStartTime ? formatTime(entry.lunchStartTime) : 'N/A',
      entry.lunchEndTime ? formatTime(entry.lunchEndTime) : 'N/A',
      entry.formattedDuration || 'N/A',
      entry.formattedLunchDuration || 'N/A',
      entry.isActive ? (entry.isOnLunch ? 'On Lunch' : 'Active') : 'Completed'
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
    if (!newUser.username.trim() || !newUser.displayName.trim()) {
      alert('Please fill in both username and display name');
      return;
    }

    try {
      setCreatingUser(true);
      const createdUser = await api.createUser({
        username: newUser.username.trim(),
        displayName: newUser.displayName.trim()
      });
      
      setUsers(prev => [...prev, {
        id: createdUser.id,
        username: createdUser.username,
        displayName: createdUser.displayName
      }]);
      
      setNewUser({ username: '', displayName: '' });
      setShowCreateUser(false);
      alert('User created successfully!');
    } catch (err) {
      console.error('Failed to create user:', err);
      alert('Failed to create user. Please try again.');
    } finally {
      setCreatingUser(false);
    }
  };

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
              {error && (
                <div className="text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-lg">
                  ⚠️ {error}
                </div>
              )}
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
              >
                <Settings className="w-5 h-5" />
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
                {formatDate(new Date(dateKey))}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {entries.map((entry) => (
                  <TimeEntryCard
                    key={entry.id}
                    entry={entry}
                    onClick={() => setSelectedEntry(entry)}
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

      {/* Settings Modal */}
      {showSettings && (
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
                            <div className="font-medium text-gray-900">{user.displayName}</div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                          </div>
                          <div className="text-sm text-gray-400">ID: {user.id.slice(0, 8)}...</div>
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
                    setNewUser({ username: '', displayName: '' });
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

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateUser(false);
                      setNewUser({ username: '', displayName: '' });
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateUser}
                    disabled={creatingUser || !newUser.username.trim() || !newUser.displayName.trim()}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingUser ? 'Creating...' : 'Create User'}
                  </button>
                </div>
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
    </div>
  );
}

export default App; 