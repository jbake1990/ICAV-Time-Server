import { format, parseISO, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';

export const formatTime = (date: Date | string): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Time';
    }
    return format(dateObj, 'h:mm a');
  } catch (error) {
    return 'Invalid Time';
  }
};

export const formatDate = (date: Date | string): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    return format(dateObj, 'MMM d, yyyy');
  } catch (error) {
    return 'Invalid Date';
  }
};

export const formatDateTime = (date: Date | string): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date/Time';
    }
    return format(dateObj, 'MMM d, yyyy h:mm a');
  } catch (error) {
    return 'Invalid Date/Time';
  }
};

export const getRelativeDate = (date: Date | string): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    
    if (isToday(dateObj)) return 'Today';
    if (isYesterday(dateObj)) return 'Yesterday';
    if (isThisWeek(dateObj)) return format(dateObj, 'EEEE');
    if (isThisMonth(dateObj)) return format(dateObj, 'MMM d');
    
    return format(dateObj, 'MMM d, yyyy');
  } catch (error) {
    return 'Invalid Date';
  }
};

export const calculateDuration = (startTime: Date, endTime?: Date): number | null => {
  if (!endTime) return null;
  return endTime.getTime() - startTime.getTime();
};

export const formatDuration = (durationMs: number): string => {
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const formatDurationHours = (durationMs: number): string => {
  const hours = durationMs / (1000 * 60 * 60);
  return hours.toFixed(2);
};

export const getStatusColor = (isActive: boolean, isOnLunch: boolean, isDriving: boolean): string => {
  if (isDriving) return 'text-blue-600 bg-blue-100';
  if (isOnLunch) return 'text-yellow-600 bg-yellow-100';
  if (isActive) return 'text-green-600 bg-green-100';
  return 'text-gray-600 bg-gray-100';
};

export const getStatusText = (isActive: boolean, isOnLunch: boolean, isDriving: boolean): string => {
  if (isDriving) return 'Driving';
  if (isOnLunch) return 'On Lunch';
  if (isActive) return 'Active';
  return 'Completed';
}; 