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
  isSameMonth,
  getDay
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
  rejection_reason?: string;
}

const calculateTotalHours = (hours: WeeklyHours | null | undefined): number => {
  if (!hours) return 0;
  
  return Object.values(hours).reduce((total, dayHours) => {
    if (!dayHours || !dayHours.standard) return total;
    
    const [h, m] = (dayHours.standard || '0:0').split(':').map(Number);
    return total + (h || 0) + ((m || 0) / 60);
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

  const initializeWeek = (weekStart: Date, currentMonth: Date) => {
    const weekDays: { [key: string]: { standard: string; comments?: string } } = {};
    
    // Generate all 7 days of the week
    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(weekStart, i);
      const dateString = format(currentDate, 'yyyy-MM-dd');
      const dayOfWeek = getDay(currentDate); // 0 = Sunday, 1-5 = Mon-Fri, 6 = Saturday
      
      // Check if the day is in the current month
      const isCurrentMonth = isSameMonth(currentDate, currentMonth);
      
      // Set hours based on weekday (Mon-Fri) and current month
      weekDays[dateString] = {
        // 1-5 are Monday to Friday, 0 is Sunday, 6 is Saturday
        // Only set hours if it's a weekday AND in the current month
        standard: (dayOfWeek > 0 && dayOfWeek < 6 && isCurrentMonth) ? '8:00' : '0:00',
        comments: ''
      };
    }

    return weekDays;
  };

  const handleDocumentUpload = async (timesheet: TimesheetEntry) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.png,.jpg,.jpeg';

    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files?.length) return;

      try {
        setUploading(true);
        const uploadedUrls: string[] = [];

        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${timesheet.week_starting}/${Date.now()}.${fileExt}`;

          const { data, error } = await supabase.storage
            .from('timesheet-documents')
            .upload(fileName, file);

          if (error) throw error;
          uploadedUrls.push(fileName);
        }

        // First, check if a timesheet exists
        const { data: existingTimesheet } = await supabase
          .from('timesheets')
          .select('*')
          .eq('user_id', userData?.id)
          .eq('week_starting', timesheet.week_starting)
          .maybeSingle(); // Use maybeSingle instead of single

        const documents = [
          ...(existingTimesheet?.documents || []),
          ...uploadedUrls
        ];

        // Update or insert timesheet
        const { error: updateError } = await supabase
          .from('timesheets')
          .upsert({
            ...timesheet,
            user_id: userData?.id,
            documents,
            updated_at: new Date().toISOString()
          });

        if (updateError) throw updateError;

        // Update local state
        setTimesheets(prev => prev.map(ts => {
          if (ts.week_starting === timesheet.week_starting) {
            return {
              ...ts,
              documents
            };
          }
          return ts;
        }));

        toast.success('Documents uploaded successfully');
      } catch (error) {
        console.error('Error uploading documents:', error);
        toast.error('Failed to upload documents');
      } finally {
        setUploading(false);
      }
    };

    input.click();
  };

  const fetchTimesheets = async () => {
    try {
      setLoading(true);
      const weeks = getMonthWeeks();
      const startDate = format(weeks[0], 'yyyy-MM-dd');
      const endDate = format(weeks[weeks.length - 1], 'yyyy-MM-dd');

      // Fetch existing timesheets for the date range
      const { data: existingTimesheets, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('user_id', userData?.id)
        .or(`week_starting.gte.${startDate},week_ending.lte.${endDate}`);

      if (error) throw error;

      console.log('Existing timesheets:', existingTimesheets);

      // Initialize timesheets for each week
      const initializedTimesheets = weeks.map(weekStart => {
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const weekEndStr = format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

        // Find existing timesheet for this week by exact week_starting match
        const existingTimesheet = existingTimesheets?.find(ts => 
          ts.week_starting === weekStartStr || ts.week_ending === weekEndStr
        );

        if (existingTimesheet) {
          console.log(`Found existing timesheet for week ${weekStartStr}:`, existingTimesheet);
          const parsedHours = existingTimesheet.hours 
            ? (typeof existingTimesheet.hours === 'string' 
                ? JSON.parse(existingTimesheet.hours) 
                : existingTimesheet.hours)
            : null;
          
          return {
            ...existingTimesheet,
            hours: parsedHours || initializeWeek(weekStart, currentMonth),
            status: existingTimesheet.status || 'draft',
            week_starting: weekStartStr,
            week_ending: weekEndStr,
            total_hours: calculateTotalHours(parsedHours)
          };
        }

        // Create new timesheet if none exists
        console.log(`Creating new timesheet for week ${weekStartStr}`);
        const initialHours = initializeWeek(weekStart, currentMonth);
        return {
          user_id: userData?.id,
          week_starting: weekStartStr,
          week_ending: weekEndStr,
          hours: initialHours,
          total_hours: calculateTotalHours(initialHours),
          status: 'draft' as const,
          month_id: format(currentMonth, 'yyyy-MM')
        };
      });

      console.log('Initialized timesheets:', initializedTimesheets);
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

  const handleSubmit = async (timesheet: TimesheetEntry) => {
    if (!userData?.id) {
      toast.error('User not authenticated');
      return;
    }

    // Check if documents are uploaded
    if (!timesheet.documents || timesheet.documents.length === 0) {
      toast.error('Please upload supporting documents before submitting the timesheet');
      return;
    }

    try {
      setUploading(true);

      // Update the timesheet status
      const updatedTimesheet = {
        ...timesheet,
        status: 'submitted',
        rejection_reason: null, // Clear any previous rejection reason
        updated_at: new Date().toISOString()
      };

      // Remove the id field if it exists (for resubmission)
      if (updatedTimesheet.id) {
        delete updatedTimesheet.id;
      }

      // First, delete the existing timesheet if it exists
      const { error: deleteError } = await supabase
        .from('timesheets')
        .delete()
        .eq('user_id', userData.id)
        .eq('week_ending', timesheet.week_ending);

      if (deleteError) throw deleteError;

      // Then insert the new timesheet
      const { error: insertError } = await supabase
        .from('timesheets')
        .insert(updatedTimesheet);

      if (insertError) throw insertError;

      toast.success(timesheet.status === 'rejected' ? 'Timesheet resubmitted successfully' : 'Timesheet submitted successfully');
      await fetchTimesheets(); // Refresh the data
    } catch (error) {
      console.error('Error submitting timesheet:', error);
      toast.error('Failed to submit timesheet');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchTimesheets();
  }, [currentMonth]);

  const getTimesheetStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-yellow-400/10 text-yellow-400';
      case 'approved':
        return 'bg-green-400/10 text-green-400';
      case 'rejected':
        return 'bg-red-400/10 text-red-400';
      default:
        return 'bg-glass-light text-white/70';
    }
  };

  // Add a helper function to check if documents exist
  const hasDocuments = (timesheet: TimesheetEntry) => {
    return timesheet.documents && timesheet.documents.length > 0;
  };

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
          <Loader className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {timesheets.map((timesheet, index) => (
            <div 
              key={index}
              className={`p-6 rounded-lg ${
                timesheet.status !== 'draft' 
                  ? getTimesheetStatusColor(timesheet.status)
                  : 'bg-glass-light'
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium">Week {index + 1}</h3>
                  <p className="text-sm text-white/70">
                    {format(new Date(timesheet.week_starting), 'MMM d')} - {format(new Date(timesheet.week_ending), 'MMM d, yyyy')}
                  </p>
                </div>
                {timesheet.status !== 'draft' && (
                  <span className={`px-3 py-1 rounded-full text-sm ${getTimesheetStatusColor(timesheet.status)}`}>
                    {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                  </span>
                )}
              </div>

              {/* Timesheet Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-white/70 border-b border-white/10">
                      <th className="text-left py-2">Pay Classification</th>
                      {Object.keys(timesheet.hours).map(date => (
                        <th key={date} className="text-center py-2">
                          <div>{format(new Date(date), 'EEE')}</div>
                          <div className="text-sm">{format(new Date(date), 'd-MMM')}</div>
                        </th>
                      ))}
                      <th className="text-center py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2">Standard Time</td>
                      {Object.entries(timesheet.hours).map(([date, hours]) => (
                        <td key={date} className="text-center py-2">
                          <input
                            type="text"
                            value={hours.standard}
                            onChange={(e) => handleHoursUpdate(
                              timesheet.week_starting,
                              date,
                              e.target.value
                            )}
                            className="w-16 text-center bg-transparent border-b border-white/20 focus:border-primary-500 outline-none"
                            disabled={timesheet.status !== 'draft'}
                          />
                        </td>
                      ))}
                      <td className="text-center py-2">{timesheet.total_hours.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex justify-between items-center mt-4">
                <div>
                  <div className={`px-4 py-2 rounded-lg ${
                    timesheet.status === 'draft' || !timesheet.status
                      ? 'bg-yellow-400/10 text-yellow-400'
                      : timesheet.status === 'submitted'
                      ? 'bg-blue-400/10 text-blue-400'
                      : timesheet.status === 'approved'
                      ? 'bg-green-400/10 text-green-400'
                      : 'bg-red-400/10 text-red-400'
                  }`}>
                    <span className="text-sm">
                      {!timesheet.status || timesheet.status === 'draft'
                        ? 'Not Submitted'
                        : `Timesheet ${timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}`
                      }
                    </span>
                  </div>
                  {timesheet.status === 'rejected' && timesheet.rejection_reason && (
                    <div className="mt-2 text-sm text-red-400">
                      <span className="font-semibold">Reason: </span>
                      {timesheet.rejection_reason}
                    </div>
                  )}
                </div>

                {(!timesheet.status || timesheet.status === 'draft' || timesheet.status === 'rejected') && (
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleDocumentUpload(timesheet)}
                      className={`btn-secondary flex items-center gap-2 ${
                        hasDocuments(timesheet) ? 'bg-green-400/10 text-green-400' : ''
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      {hasDocuments(timesheet) ? 'Documents Uploaded' : 'Upload Documents'}
                    </button>
                    <button
                      onClick={() => handleSubmit(timesheet)}
                      className="btn-primary flex items-center gap-2"
                      disabled={uploading || !hasDocuments(timesheet)}
                    >
                      {uploading ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : timesheet.status === 'rejected' ? (
                        'Resubmit'
                      ) : (
                        'Save Week'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Timesheets;