import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight,
  MessageCircle,
  Upload,
  Loader
} from 'lucide-react';
import { 
  startOfMonth, 
  endOfMonth, 
  eachWeekOfInterval,
  format,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addDays,
  isSameMonth 
} from 'date-fns';
import { supabase } from '../../config/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

interface DayHours {
  standard: string;
  comments?: string;
}

interface WeeklyHours {
  [date: string]: DayHours;
}

interface TimesheetEntry {
  id?: string;
  user_id: string;
  week_starting: string;
  week_ending: string;
  hours: WeeklyHours;
  total_hours: number;
  documents?: string[];
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  created_at?: string;
  month_id: string;
}

const calculateTotalHours = (hours: WeeklyHours): number => {
  return Object.values(hours).reduce((total, dayHours) => {
    const [h, m] = dayHours.standard.split(':').map(Number);
    return total + h + m / 60;
  }, 0);
};

const Timesheets = () => {
  const { userData } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [uploading, setUploading] = useState(false);

  const getMonthWeeks = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachWeekOfInterval(
      { start: firstWeekStart, end: lastWeekEnd },
      { weekStartsOn: 1 }
    );
  };

  const initializeWeek = (weekStart: Date): WeeklyHours => {
    const hours: WeeklyHours = {};
    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(weekStart, i);
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      hours[format(currentDate, 'yyyy-MM-dd')] = {
        standard: isWeekend ? '00:00' : '08:00',
        comments: ''
      };
    }
    return hours;
  };

  const handleDocumentUpload = async (files: FileList, weekStarting: string) => {
    if (!files.length) return [];
    
    try {
      setUploading(true);
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${weekStarting}/${Date.now()}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('timesheet-documents')
          .upload(fileName, file);

        if (error) throw error;
        uploadedUrls.push(fileName);
      }

      return uploadedUrls;
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast.error('Failed to upload documents');
      return [];
    } finally {
      setUploading(false);
    }
  };

  const fetchTimesheets = async () => {
    if (!userData?.id) return;
    try {
      setLoading(true);
      const weeks = getMonthWeeks();
      const startDate = format(weeks[0], 'yyyy-MM-dd');
      const endDate = format(weeks[weeks.length - 1], 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('user_id', userData.id)
        .gte('week_starting', startDate)
        .lte('week_ending', endDate);

      if (error) throw error;

      const timesheetMap = new Map(data?.map(ts => [ts.week_starting, ts]));
      const initializedTimesheets = weeks.map(weekStart => {
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const existingTimesheet = timesheetMap.get(weekStartStr);
        
        if (existingTimesheet) {
          return {
            ...existingTimesheet,
            hours: typeof existingTimesheet.hours === 'string' 
              ? JSON.parse(existingTimesheet.hours) 
              : existingTimesheet.hours
          };
        }

        const initialHours = initializeWeek(weekStart);
        return {
          user_id: userData.id,
          week_starting: weekStartStr,
          week_ending: format(weekEnd, 'yyyy-MM-dd'),
          hours: initialHours,
          total_hours: calculateTotalHours(initialHours),
          status: 'draft' as const,
          month_id: format(currentMonth, 'yyyy-MM')
        };
      });

      setTimesheets(initializedTimesheets);
    } catch (error) {
      console.error('Error fetching timesheets:', error);
      toast.error('Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  };

  const handleHoursUpdate = async (
    weekStarting: string,
    date: string,
    value: string,
    field: 'standard' | 'comments' = 'standard'
  ) => {
    const updatedTimesheets = timesheets.map(timesheet => {
      if (timesheet.week_starting === weekStarting) {
        const updatedHours = {
          ...timesheet.hours,
          [date]: {
            ...timesheet.hours[date],
            [field]: value
          }
        };

        return {
          ...timesheet,
          hours: updatedHours,
          total_hours: calculateTotalHours(updatedHours)
        };
      }
      return timesheet;
    });

    setTimesheets(updatedTimesheets);
  };

  const saveTimesheet = async (timesheet: TimesheetEntry) => {
    try {
      const weekStart = new Date(timesheet.week_starting);
      const weekEnd = new Date(timesheet.week_ending);
      const monthEntries: TimesheetEntry[] = [];

      // Prepare data for first month
      monthEntries.push({
        ...timesheet,
        hours: timesheet.hours, // This will be stringified by Supabase
        total_hours: calculateTotalHours(timesheet.hours),
        month_id: format(weekStart, 'yyyy-MM')
      });

      // If week spans two months, prepare data for second month
      if (!isSameMonth(weekStart, weekEnd)) {
        monthEntries.push({
          ...timesheet,
          hours: timesheet.hours,
          total_hours: calculateTotalHours(timesheet.hours),
          month_id: format(weekEnd, 'yyyy-MM')
        });
      }

      // Save all month entries
      for (const entry of monthEntries) {
        const { error } = await supabase
          .from('timesheets')
          .upsert({
            ...entry,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'week_starting,month_id'
          });

        if (error) throw error;
      }

      toast.success('Timesheet saved successfully');
    } catch (error) {
      console.error('Error saving timesheet:', error);
      toast.error('Failed to save timesheet');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.id) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setUploading(true);
      const weekStart = new Date(timesheet.week_starting);
      const weekEnd = new Date(timesheet.week_ending);
      const monthEntries: TimesheetEntry[] = [];

      // Prepare data for first month
      monthEntries.push({
        ...timesheet,
        user_id: userData.id,
        hours: timesheet.hours,
        total_hours: calculateTotalHours(timesheet.hours),
        month_id: format(weekStart, 'yyyy-MM')
      });

      // If week spans two months, prepare data for second month
      if (!isSameMonth(weekStart, weekEnd)) {
        monthEntries.push({
          ...timesheet,
          user_id: userData.id,
          hours: timesheet.hours,
          total_hours: calculateTotalHours(timesheet.hours),
          month_id: format(weekEnd, 'yyyy-MM')
        });
      }

      // Save all month entries
      for (const entry of monthEntries) {
        const { error } = await supabase
          .from('timesheets')
          .upsert({
            ...entry,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'week_starting,month_id'
          });

        if (error) throw error;
      }

      toast.success('Timesheet saved successfully');
      await fetchTimesheets(); // Refresh the data
    } catch (error) {
      console.error('Error saving timesheet:', error);
      toast.error('Failed to save timesheet');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchTimesheets();
  }, [currentMonth]);

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex justify-between items-center">
        <button 
          onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
          className="p-2 hover:bg-gray-800 rounded"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-medium">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button 
          onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
          className="p-2 hover:bg-gray-800 rounded"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        timesheets.map((timesheet, weekIndex) => (
          <div key={timesheet.week_starting} className="glass-card">
            <div className="border-b border-gray-800">
              <div className="flex items-center justify-between p-4">
                <h3 className="text-lg font-medium text-blue-400">
                  Week {weekIndex + 1}
                </h3>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    multiple
                    onChange={async (e) => {
                      if (e.target.files) {
                        const urls = await handleDocumentUpload(e.target.files, timesheet.week_starting);
                        if (urls.length) {
                          const updatedTimesheet = {
                            ...timesheet,
                            documents: [...(timesheet.documents || []), ...urls]
                          };
                          setTimesheets(prev => prev.map(ts => 
                            ts.week_starting === timesheet.week_starting ? updatedTimesheet : ts
                          ));
                          await saveTimesheet(updatedTimesheet);
                        }
                      }
                    }}
                    className="hidden"
                    id={`file-upload-${weekIndex}`}
                  />
                  <label 
                    htmlFor={`file-upload-${weekIndex}`}
                    className="flex items-center gap-2 cursor-pointer hover:text-blue-400"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Documents</span>
                  </label>
                  <button
                    onClick={() => saveTimesheet(timesheet)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Save Week
                  </button>
                </div>
              </div>
            </div>

            {/* Weekly timesheet table content */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="p-4 text-left">Pay Classification</th>
                    {Object.keys(timesheet.hours).map(date => (
                      <th key={date} className="p-4 text-center">
                        {format(new Date(date), 'EEE')}
                        <div className="text-sm text-gray-500">
                          {format(new Date(date), 'd-MMM')}
                        </div>
                      </th>
                    ))}
                    <th className="p-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-800">
                    <td className="p-4 text-gray-300">Standard Time</td>
                    {Object.entries(timesheet.hours).map(([date, hours]) => (
                      <td key={date} className="p-4">
                        <div className="flex justify-center items-center gap-2">
                          <input
                            type="text"
                            value={hours.standard}
                            onChange={(e) => handleHoursUpdate(
                              timesheet.week_starting,
                              date,
                              e.target.value
                            )}
                            className="w-16 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-center focus:border-blue-500 focus:outline-none"
                          />
                          <MessageCircle 
                            className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-400"
                            onClick={() => {
                              // Handle comments
                              const comment = prompt('Add comment:', hours.comments);
                              if (comment !== null) {
                                handleHoursUpdate(
                                  timesheet.week_starting,
                                  date,
                                  comment,
                                  'comments'
                                );
                              }
                            }}
                          />
                        </div>
                      </td>
                    ))}
                    <td className="p-4 text-right">
                      {timesheet.total_hours.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Timesheets;