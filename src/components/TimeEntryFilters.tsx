import React, { useState } from 'react';
import { Search, Filter, Calendar, User, Building } from 'lucide-react';
import { TimeEntryFilters } from '../types';

interface TimeEntryFiltersProps {
  filters: TimeEntryFilters;
  onFiltersChange: (filters: TimeEntryFilters) => void;
  technicianNames: string[];
  customerNames: string[];
}

const TimeEntryFiltersComponent: React.FC<TimeEntryFiltersProps> = ({
  filters,
  onFiltersChange,
  technicianNames,
  customerNames,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: keyof TimeEntryFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <Filter className="w-4 h-4" />
          <span>{isExpanded ? 'Hide' : 'Show'} Advanced Filters</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by technician or customer..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          value={filters.technicianName || filters.customerName || ''}
          onChange={(e) => {
            const value = e.target.value;
            handleFilterChange('technicianName', value);
            handleFilterChange('customerName', value);
          }}
        />
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Technician Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Technician
            </label>
            <select
              value={filters.technicianName || ''}
              onChange={(e) => handleFilterChange('technicianName', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Technicians</option>
              {technicianNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building className="w-4 h-4 inline mr-1" />
              Customer
            </label>
            <select
              value={filters.customerName || ''}
              onChange={(e) => handleFilterChange('customerName', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Customers</option>
              {customerNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Status
            </label>
            <select
              value={filters.status || 'all'}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Entries</option>
              <option value="active">Active Only</option>
              <option value="completed">Completed Only</option>
            </select>
          </div>
        </div>
      )}

      {/* Quick Date Filters */}
      <div className="flex flex-wrap gap-2 mt-4">
        <button
          onClick={() => {
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
            handleFilterChange('dateRange', { start: startOfDay, end: endOfDay });
          }}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
        >
          Today
        </button>
        <button
          onClick={() => {
            const today = new Date();
            const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            handleFilterChange('dateRange', { start: startOfWeek, end: today });
          }}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
        >
          Last 7 Days
        </button>
        <button
          onClick={() => {
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            handleFilterChange('dateRange', { start: startOfMonth, end: today });
          }}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
        >
          This Month
        </button>
        <button
          onClick={() => handleFilterChange('dateRange', undefined)}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
        >
          Clear Date Filter
        </button>
      </div>
    </div>
  );
};

export default TimeEntryFiltersComponent; 