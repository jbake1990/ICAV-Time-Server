import React from 'react';
import { Clock, User, Building, Calendar, Timer, Car, Trash2 } from 'lucide-react';
import { TimeEntry } from '../types';
import { formatTime, formatDate, formatDuration, getStatusColor, getStatusText } from '../utils/timeUtils';

interface TimeEntryCardProps {
  entry: TimeEntry;
  onClick?: () => void;
  onDelete?: (entryId: string) => void;
  isDeleting?: boolean;
}

const TimeEntryCard: React.FC<TimeEntryCardProps> = ({ entry, onClick, onDelete, isDeleting = false }) => {
  console.log('TimeEntryCard received entry:', entry);
  console.log('Drive time data:', {
    driveStartTime: entry.driveStartTime,
    driveEndTime: entry.driveEndTime,
    driveDuration: entry.driveDuration,
    formattedDriveDuration: entry.formattedDriveDuration
  });

  const statusColor = getStatusColor(entry.isActive, entry.isOnLunch, entry.isDriving);
  const statusText = getStatusText(entry.isActive, entry.isOnLunch, entry.isDriving);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card's onClick
    if (onDelete) {
      onDelete(entry.id);
    }
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow ${
        onClick ? 'cursor-pointer hover:border-primary-300' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <User className="w-5 h-5 text-gray-500" />
          <span className="font-semibold text-gray-900">{entry.technicianName}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
            {statusText}
          </span>
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={`p-2 rounded-full hover:bg-red-50 transition-colors ${
                isDeleting ? 'opacity-50 cursor-not-allowed' : 'hover:text-red-600'
              }`}
              title="Delete entry"
            >
              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-600" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Building className="w-4 h-4 text-gray-500" />
          <span className="text-gray-700">{entry.customerName}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {entry.clockInTime && (
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Clock In</p>
                <p className="font-medium text-gray-900">
                  {formatTime(entry.clockInTime)}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(entry.clockInTime)}
                </p>
              </div>
            </div>
          )}

          {entry.clockOutTime && (
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Clock Out</p>
                <p className="font-medium text-gray-900">
                  {formatTime(entry.clockOutTime)}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(entry.clockOutTime)}
                </p>
              </div>
            </div>
          )}
        </div>

        {entry.driveStartTime && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Car className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Drive Start</p>
                <p className="font-medium text-gray-900">
                  {formatTime(entry.driveStartTime)}
                </p>
              </div>
            </div>

            {entry.driveEndTime && (
              <div className="flex items-center space-x-2">
                <Car className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Drive End</p>
                  <p className="font-medium text-gray-900">
                    {formatTime(entry.driveEndTime)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {entry.lunchStartTime && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Lunch Start</p>
                <p className="font-medium text-gray-900">
                  {formatTime(entry.lunchStartTime)}
                </p>
              </div>
            </div>

            {entry.lunchEndTime && (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Lunch End</p>
                  <p className="font-medium text-gray-900">
                    {formatTime(entry.lunchEndTime)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {entry.duration && (
          <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
            <Timer className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Total Duration</p>
              <p className="font-semibold text-primary-600">
                {formatDuration(entry.duration)}
              </p>
            </div>
          </div>
        )}

        {entry.driveDuration && (
          <div className="flex items-center space-x-2">
            <Car className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500">Drive Duration</p>
              <p className="font-medium text-blue-600">
                {formatDuration(entry.driveDuration)}
              </p>
            </div>
          </div>
        )}

        {entry.lunchDuration && (
          <div className="flex items-center space-x-2">
            <Timer className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Lunch Duration</p>
              <p className="font-medium text-gray-700">
                {formatDuration(entry.lunchDuration)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeEntryCard; 