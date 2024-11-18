import React from 'react';
import { format } from 'date-fns';
import { Clock, User, Building2, Calendar } from 'lucide-react';

interface TimesheetPreviewProps {
  timesheet: {
    week_starting: string;
    week_ending: string;
    hours: {
      [date: string]: {
        standard: string;
        comments?: string;
      };
    };
    users: {
      first_name: string;
      last_name: string;
      clients?: {
        name: string;
      } | null;
    };
  };
}

const TimesheetPreview = ({ timesheet }: TimesheetPreviewProps) => {
  const calculateTotalHours = () => {
    return Object.values(timesheet.hours).reduce((total, day) => {
      const [h, m] = day.standard.split(':').map(Number);
      return total + h + (m / 60);
    }, 0);
  };

  return (
    <div className="bg-glass-light p-6 rounded-lg space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-semibold">Timesheet</h2>
          <div className="flex items-center gap-2 mt-2 text-white/70">
            <Calendar className="w-4 h-4" />
            <span>
              {format(new Date(timesheet.week_starting), 'MMM d')} - {format(new Date(timesheet.week_ending), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-white/70" />
            <span>{`${timesheet.users.first_name} ${timesheet.users.last_name}`}</span>
          </div>
          {timesheet.users.clients?.name && (
            <div className="flex items-center gap-2 mt-1 text-white/70">
              <Building2 className="w-4 h-4" />
              <span>{timesheet.users.clients.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Daily Hours */}
      <div>
        <h3 className="text-sm text-white/70 mb-3">Daily Hours</h3>
        <div className="space-y-2">
          {Object.entries(timesheet.hours).map(([date, hours]) => (
            <div key={date} className="flex justify-between items-center p-3 bg-glass-medium rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-primary-400" />
                <span>{format(new Date(date), 'EEEE, MMM d')}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-white/70">{hours.standard}</span>
                {hours.comments && (
                  <div className="text-sm text-white/50 max-w-xs truncate">
                    {hours.comments}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total Hours */}
      <div className="flex justify-end border-t border-white/10 pt-4">
        <div className="text-right">
          <span className="text-white/70">Total Hours:</span>
          <span className="ml-2 font-semibold">{calculateTotalHours().toFixed(2)}h</span>
        </div>
      </div>
    </div>
  );
};

export default TimesheetPreview; 