import React, { useState, useMemo } from 'react';
import { Calendar, Download, FileText, Users, Building, Clock, Filter, BarChart3, X } from 'lucide-react';
import { TimeEntry, ReportType, ReportFilters, ReportData, TechnicianReport, CustomerReport } from '../types';
import { formatDate, formatTime } from '../utils/timeUtils';

interface ReportsProps {
  timeEntries: TimeEntry[];
  onClose: () => void;
}

export default function Reports({ timeEntries, onClose }: ReportsProps) {
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('summary');
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
      end: new Date()
    },
    includeDriveTime: true,
    includeLunchTime: true,
    groupBy: 'day'
  });

  const reportTypes = [
    { id: 'summary', name: 'Summary Report', icon: BarChart3, description: 'Overview of all time entries' },
    { id: 'daily', name: 'Daily Report', icon: Calendar, description: 'Daily breakdown of time entries' },
    { id: 'weekly', name: 'Weekly Report', icon: Calendar, description: 'Weekly summary of time entries' },
    { id: 'monthly', name: 'Monthly Report', icon: Calendar, description: 'Monthly summary of time entries' },
    { id: 'technician', name: 'Technician Report', icon: Users, description: 'Time entries grouped by technician' },
    { id: 'customer', name: 'Customer Report', icon: Building, description: 'Time entries grouped by customer' },
    { id: 'custom', name: 'Custom Report', icon: Filter, description: 'Custom date range and filters' }
  ];

  // Filter entries based on current filters
  const filteredEntries = useMemo(() => {
    return timeEntries.filter(entry => {
      const entryDate = entry.clockInTime || entry.driveStartTime;
      if (!entryDate) return false;

      // Date range filter
      if (entryDate < filters.dateRange.start || entryDate > filters.dateRange.end) {
        return false;
      }

      // Technician filter
      if (filters.technicianName && !entry.technicianName.toLowerCase().includes(filters.technicianName.toLowerCase())) {
        return false;
      }

      // Customer filter
      if (filters.customerName && !entry.customerName.toLowerCase().includes(filters.customerName.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [timeEntries, filters]);

  // Generate report data
  const reportData = useMemo((): ReportData => {
    const totalEntries = filteredEntries.length;
    const totalHours = filteredEntries
      .filter(entry => entry.duration)
      .reduce((sum, entry) => sum + (entry.duration || 0), 0) / (1000 * 60 * 60);
    
    const totalDriveHours = filteredEntries
      .filter(entry => entry.driveDuration)
      .reduce((sum, entry) => sum + (entry.driveDuration || 0), 0) / (1000 * 60 * 60);
    
    const totalLunchHours = filteredEntries
      .filter(entry => entry.lunchDuration)
      .reduce((sum, entry) => sum + (entry.lunchDuration || 0), 0) / (1000 * 60 * 60);

    const techniciansCount = new Set(filteredEntries.map(entry => entry.technicianName)).size;
    const customersCount = new Set(filteredEntries.map(entry => entry.customerName)).size;
    
    const daysCount = Math.max(1, new Set(filteredEntries.map(entry => {
      const date = entry.clockInTime || entry.driveStartTime;
      return date ? date.toDateString() : 'unknown';
    })).size);

    const averageHoursPerDay = totalHours / daysCount;

    // Group data based on selected grouping
    let groupedData: ReportData['groupedData'] = {};
    
    if (filters.groupBy === 'day') {
      filteredEntries.forEach(entry => {
        const dateKey = (entry.clockInTime || entry.driveStartTime)?.toDateString() || 'Unknown';
        if (!groupedData![dateKey]) {
          groupedData![dateKey] = {
            entries: [],
            totalHours: 0,
            totalDriveHours: 0,
            totalLunchHours: 0,
            entryCount: 0
          };
        }
        groupedData![dateKey].entries.push(entry);
        groupedData![dateKey].totalHours += (entry.duration || 0) / (1000 * 60 * 60);
        groupedData![dateKey].totalDriveHours += (entry.driveDuration || 0) / (1000 * 60 * 60);
        groupedData![dateKey].totalLunchHours += (entry.lunchDuration || 0) / (1000 * 60 * 60);
        groupedData![dateKey].entryCount += 1;
      });
    } else if (filters.groupBy === 'technician') {
      filteredEntries.forEach(entry => {
        const techKey = entry.technicianName;
        if (!groupedData![techKey]) {
          groupedData![techKey] = {
            entries: [],
            totalHours: 0,
            totalDriveHours: 0,
            totalLunchHours: 0,
            entryCount: 0
          };
        }
        groupedData![techKey].entries.push(entry);
        groupedData![techKey].totalHours += (entry.duration || 0) / (1000 * 60 * 60);
        groupedData![techKey].totalDriveHours += (entry.driveDuration || 0) / (1000 * 60 * 60);
        groupedData![techKey].totalLunchHours += (entry.lunchDuration || 0) / (1000 * 60 * 60);
        groupedData![techKey].entryCount += 1;
      });
    } else if (filters.groupBy === 'customer') {
      filteredEntries.forEach(entry => {
        const customerKey = entry.customerName;
        if (!groupedData![customerKey]) {
          groupedData![customerKey] = {
            entries: [],
            totalHours: 0,
            totalDriveHours: 0,
            totalLunchHours: 0,
            entryCount: 0
          };
        }
        groupedData![customerKey].entries.push(entry);
        groupedData![customerKey].totalHours += (entry.duration || 0) / (1000 * 60 * 60);
        groupedData![customerKey].totalDriveHours += (entry.driveDuration || 0) / (1000 * 60 * 60);
        groupedData![customerKey].totalLunchHours += (entry.lunchDuration || 0) / (1000 * 60 * 60);
        groupedData![customerKey].entryCount += 1;
      });
    }

    return {
      type: selectedReportType,
      filters,
      generatedAt: new Date(),
      summary: {
        totalEntries,
        totalHours,
        totalDriveHours,
        totalLunchHours,
        averageHoursPerDay,
        techniciansCount,
        customersCount
      },
      entries: filteredEntries,
      groupedData
    };
  }, [filteredEntries, selectedReportType, filters]);

  // Generate technician reports
  const technicianReports = useMemo((): TechnicianReport[] => {
    const techMap = new Map<string, TechnicianReport>();
    
    filteredEntries.forEach(entry => {
      if (!techMap.has(entry.technicianName)) {
        techMap.set(entry.technicianName, {
          technicianName: entry.technicianName,
          totalHours: 0,
          totalDriveHours: 0,
          totalLunchHours: 0,
          entryCount: 0,
          customers: [],
          averageHoursPerDay: 0,
          entries: []
        });
      }
      
      const report = techMap.get(entry.technicianName)!;
      report.entries.push(entry);
      report.totalHours += (entry.duration || 0) / (1000 * 60 * 60);
      report.totalDriveHours += (entry.driveDuration || 0) / (1000 * 60 * 60);
      report.totalLunchHours += (entry.lunchDuration || 0) / (1000 * 60 * 60);
      report.entryCount += 1;
      
      if (!report.customers.includes(entry.customerName)) {
        report.customers.push(entry.customerName);
      }
    });

    // Calculate average hours per day for each technician
    techMap.forEach(report => {
      const daysCount = Math.max(1, new Set(report.entries.map(entry => {
        const date = entry.clockInTime || entry.driveStartTime;
        return date ? date.toDateString() : 'unknown';
      })).size);
      report.averageHoursPerDay = report.totalHours / daysCount;
    });

    return Array.from(techMap.values()).sort((a, b) => b.totalHours - a.totalHours);
  }, [filteredEntries]);

  // Generate customer reports
  const customerReports = useMemo((): CustomerReport[] => {
    const customerMap = new Map<string, CustomerReport>();
    
    filteredEntries.forEach(entry => {
      if (!customerMap.has(entry.customerName)) {
        customerMap.set(entry.customerName, {
          customerName: entry.customerName,
          totalHours: 0,
          totalDriveHours: 0,
          totalLunchHours: 0,
          entryCount: 0,
          technicians: [],
          averageHoursPerDay: 0,
          entries: []
        });
      }
      
      const report = customerMap.get(entry.customerName)!;
      report.entries.push(entry);
      report.totalHours += (entry.duration || 0) / (1000 * 60 * 60);
      report.totalDriveHours += (entry.driveDuration || 0) / (1000 * 60 * 60);
      report.totalLunchHours += (entry.lunchDuration || 0) / (1000 * 60 * 60);
      report.entryCount += 1;
      
      if (!report.technicians.includes(entry.technicianName)) {
        report.technicians.push(entry.technicianName);
      }
    });

    // Calculate average hours per day for each customer
    customerMap.forEach(report => {
      const daysCount = Math.max(1, new Set(report.entries.map(entry => {
        const date = entry.clockInTime || entry.driveStartTime;
        return date ? date.toDateString() : 'unknown';
      })).size);
      report.averageHoursPerDay = report.totalHours / daysCount;
    });

    return Array.from(customerMap.values()).sort((a, b) => b.totalHours - a.totalHours);
  }, [filteredEntries]);

  // Export functions
  const exportToCSV = () => {
    const headers = [
      'Date',
      'Technician Name',
      'Customer Name',
      'Clock In Time',
      'Clock Out Time',
      'Drive Start',
      'Drive End',
      'Lunch Start',
      'Lunch End',
      'Total Duration (Hours)',
      'Drive Duration (Hours)',
      'Lunch Duration (Hours)',
      'Status'
    ];

    const csvData = filteredEntries.map(entry => [
      formatDate(entry.clockInTime || entry.driveStartTime || new Date()),
      entry.technicianName,
      entry.customerName,
      entry.clockInTime ? formatTime(entry.clockInTime) : 'N/A',
      entry.clockOutTime ? formatTime(entry.clockOutTime) : 'N/A',
      entry.driveStartTime ? formatTime(entry.driveStartTime) : 'N/A',
      entry.driveEndTime ? formatTime(entry.driveEndTime) : 'N/A',
      entry.lunchStartTime ? formatTime(entry.lunchStartTime) : 'N/A',
      entry.lunchEndTime ? formatTime(entry.lunchEndTime) : 'N/A',
      ((entry.duration || 0) / (1000 * 60 * 60)).toFixed(2),
      ((entry.driveDuration || 0) / (1000 * 60 * 60)).toFixed(2),
      ((entry.lunchDuration || 0) / (1000 * 60 * 60)).toFixed(2),
      entry.isActive ? 'Active' : 'Completed'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-tracker-report-${formatDate(new Date())}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const data = {
      report: reportData,
      technicianReports,
      customerReports,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-tracker-report-${formatDate(new Date())}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportToCSV}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={exportToJSON}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-80 border-r bg-gray-50 p-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Report Type</h3>
                <div className="space-y-2">
                  {reportTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedReportType(type.id as ReportType)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedReportType === type.id
                          ? 'bg-blue-50 border-blue-200 text-blue-900'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <type.icon className="w-5 h-5" />
                        <div>
                          <div className="font-medium">{type.name}</div>
                          <div className="text-sm text-gray-500">{type.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Filters</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date Range
                    </label>
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={filters.dateRange.start.toISOString().split('T')[0]}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, start: new Date(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="date"
                        value={filters.dateRange.end.toISOString().split('T')[0]}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, end: new Date(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Technician
                    </label>
                    <input
                      type="text"
                      placeholder="Filter by technician"
                      value={filters.technicianName || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        technicianName: e.target.value || undefined
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer
                    </label>
                    <input
                      type="text"
                      placeholder="Filter by customer"
                      value={filters.customerName || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        customerName: e.target.value || undefined
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Group By
                    </label>
                    <select
                      value={filters.groupBy}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        groupBy: e.target.value as any
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="day">Day</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                      <option value="technician">Technician</option>
                      <option value="customer">Customer</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.includeDriveTime}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          includeDriveTime: e.target.checked
                        }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Include Drive Time</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.includeLunchTime}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          includeLunchTime: e.target.checked
                        }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Include Lunch Time</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto p-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">{reportData.summary.totalEntries}</div>
                <div className="text-sm text-blue-600">Total Entries</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-900">{reportData.summary.totalHours.toFixed(1)}</div>
                <div className="text-sm text-green-600">Total Hours</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-900">{reportData.summary.totalDriveHours.toFixed(1)}</div>
                <div className="text-sm text-purple-600">Drive Hours</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-900">{reportData.summary.totalLunchHours.toFixed(1)}</div>
                <div className="text-sm text-orange-600">Lunch Hours</div>
              </div>
            </div>

            {/* Report Content */}
            <div className="space-y-6">
              {selectedReportType === 'summary' && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Summary Report</h3>
                  <div className="bg-white border rounded-lg p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Overview</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div>Total Entries: {reportData.summary.totalEntries}</div>
                          <div>Total Hours: {reportData.summary.totalHours.toFixed(1)}</div>
                          <div>Average Hours/Day: {reportData.summary.averageHoursPerDay.toFixed(1)}</div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Technicians</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div>Active Technicians: {reportData.summary.techniciansCount}</div>
                          <div>Total Customers: {reportData.summary.customersCount}</div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Time Breakdown</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div>Work Hours: {reportData.summary.totalHours.toFixed(1)}</div>
                          <div>Drive Hours: {reportData.summary.totalDriveHours.toFixed(1)}</div>
                          <div>Lunch Hours: {reportData.summary.totalLunchHours.toFixed(1)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedReportType === 'technician' && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Technician Report</h3>
                  <div className="space-y-4">
                    {technicianReports.map((report) => (
                      <div key={report.technicianName} className="bg-white border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-medium text-gray-900">{report.technicianName}</h4>
                          <div className="text-sm text-gray-500">{report.entryCount} entries</div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="font-medium text-gray-900">{report.totalHours.toFixed(1)}</div>
                            <div className="text-gray-500">Total Hours</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{report.totalDriveHours.toFixed(1)}</div>
                            <div className="text-gray-500">Drive Hours</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{report.averageHoursPerDay.toFixed(1)}</div>
                            <div className="text-gray-500">Avg Hours/Day</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{report.customers.length}</div>
                            <div className="text-gray-500">Customers</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedReportType === 'customer' && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Customer Report</h3>
                  <div className="space-y-4">
                    {customerReports.map((report) => (
                      <div key={report.customerName} className="bg-white border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-medium text-gray-900">{report.customerName}</h4>
                          <div className="text-sm text-gray-500">{report.entryCount} entries</div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="font-medium text-gray-900">{report.totalHours.toFixed(1)}</div>
                            <div className="text-gray-500">Total Hours</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{report.totalDriveHours.toFixed(1)}</div>
                            <div className="text-gray-500">Drive Hours</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{report.averageHoursPerDay.toFixed(1)}</div>
                            <div className="text-gray-500">Avg Hours/Day</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{report.technicians.length}</div>
                            <div className="text-gray-500">Technicians</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grouped Data Display */}
              {reportData.groupedData && Object.keys(reportData.groupedData).length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {filters.groupBy === 'day' ? 'Daily' : 
                     filters.groupBy === 'technician' ? 'Technician' : 
                     filters.groupBy === 'customer' ? 'Customer' : 'Grouped'} Breakdown
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(reportData.groupedData).map(([key, data]) => (
                      <div key={key} className="bg-white border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-medium text-gray-900">{key}</h4>
                          <div className="text-sm text-gray-500">{data.entryCount} entries</div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="font-medium text-gray-900">{data.totalHours.toFixed(1)}</div>
                            <div className="text-gray-500">Total Hours</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{data.totalDriveHours.toFixed(1)}</div>
                            <div className="text-gray-500">Drive Hours</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{data.totalLunchHours.toFixed(1)}</div>
                            <div className="text-gray-500">Lunch Hours</div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{data.entryCount}</div>
                            <div className="text-gray-500">Entries</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Entries Table */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Detailed Entries</h3>
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock Out</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drive</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lunch</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatDate(entry.clockInTime || entry.driveStartTime || new Date())}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{entry.technicianName}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{entry.customerName}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {entry.clockInTime ? formatTime(entry.clockInTime) : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {entry.clockOutTime ? formatTime(entry.clockOutTime) : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {entry.formattedDuration || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {entry.formattedDriveDuration || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {entry.formattedLunchDuration || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 