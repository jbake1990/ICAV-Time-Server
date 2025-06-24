import React, { useState, useMemo } from 'react';
import { Clock, Users, Settings, Download } from 'lucide-react';
import { TimeEntry, TimeEntryFilters } from './types';
import { mockTimeEntries, mockDashboardStats } from './data/mockData';
import DashboardStatsComponent from './components/DashboardStats';
import TimeEntryFiltersComponent from './components/TimeEntryFilters';
import TimeEntryCard from './components/TimeEntryCard';
import { formatDate } from './utils/timeUtils';

function App() {
  const [filters, setFilters] = useState<TimeEntryFilters>({});
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);

  // Filter time entries based on current filters
  const filteredEntries = useMemo(() => {
    let filtered = [...mockTimeEntries];

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
  }, [filters]);

  // Get unique technician and customer names for filters
  const technicianNames = useMemo(() => 
    [...new Set(mockTimeEntries.map(entry => entry.technicianName))].sort(),
    []
  );

  const customerNames = useMemo(() => 
    [...new Set(mockTimeEntries.map(entry => entry.customerName))].sort(),
    []
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

  const handleExport = () => {
    // TODO: Implement CSV export functionality
    console.log('Export functionality to be implemented');
  };

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
              <button
                onClick={handleExport}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Stats */}
        <DashboardStatsComponent stats={mockDashboardStats} />

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
              Showing {filteredEntries.length} of {mockTimeEntries.length} entries
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

          {filteredEntries.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No time entries found</h3>
              <p className="text-gray-500">
                Try adjusting your filters to see more results.
              </p>
            </div>
          )}
        </div>
      </main>

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
                  ×
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