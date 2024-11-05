import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Upload,
  Calendar,
  FileText,
  Plus,
  Loader,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  BarChart2,
  Edit,
  Eye,
} from 'lucide-react';
import PageTransition from '../../components/shared/PageTransition';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import Modal from '../../components/shared/Modal';
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, endOfWeek, isSameDay, isAfter, isBefore, addMonths, subMonths, startOfWeek } from 'date-fns';
import toast from 'react-hot-toast';

interface DailyHours {
  [key: string]: number; // Format: "YYYY-MM-DD": hours
}

interface Timesheet {
  id: string;
  user_id: string;
  week_ending: string;
  hours: number;
  daily_hours: DailyHours;
  description: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  documents?: string[];
  created_at: string;
  updated_at: string;
}

interface WeekSummary {
  totalHours: number;
  status: Timesheet['status'];
  documents: string[];
  description: string;
}

const DEFAULT_WEEKLY_HOURS = 40;
const DEFAULT_DAILY_HOURS = 8; // Default hours per day

interface DocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: string[];
  weekEnding: string;
}

const DocumentsModal: React.FC<DocumentsModalProps> = ({ isOpen, onClose, documents, weekEnding }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Documents for Week Ending ${format(new Date(weekEnding), 'MMM d, yyyy')}`}
    >
      <div className="space-y-4">
        {documents.length === 0 ? (
          <p className="text-center text-white/70">No documents uploaded</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {documents.map((doc, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-glass-light rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary-400" />
                  <span>Document {index + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={doc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </a>
                  <a
                    href={doc}
                    download
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

const Timesheets = () => {
  const { userData } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedWeekEnd, setSelectedWeekEnd] = useState<Date | null>(null);
  const [formData, setFormData] = useState({
    weekEnding: format(new Date(), 'yyyy-MM-dd'),
    hours: '',
    description: '',
    documents: [] as File[],
    dailyHours: {} as DailyHours,
  });
  const [showPastTimesheets, setShowPastTimesheets] = useState(false);
  const [pastTimesheets, setPastTimesheets] = useState<Timesheet[]>([]);
  const [loadingPast, setLoadingPast] = useState(false);
  const [weekSummaries, setWeekSummaries] = useState<Record<string, WeekSummary>>({});
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [monthlyStats, setMonthlyStats] = useState({
    totalHours: 0,
    approvedHours: 0,
    pendingHours: 0,
    expectedHours: 0 // This will store the expected hours for the month
  });

  useEffect(() => {
    console.log('Component mounted with userData:', userData);
    if (userData?.id) {
      fetchTimesheets();
      calculateExpectedHours();
    }
  }, [userData?.id, currentMonth]);

  useEffect(() => {
    if (timesheets.length > 0) {
      calculateWeekSummaries();
    }
  }, [timesheets]);

  const calculateWeekSummaries = () => {
    const summaries: Record<string, WeekSummary> = {};
    
    timesheets.forEach(timesheet => {
      const weekKey = format(new Date(timesheet.week_ending), 'yyyy-MM-dd');
      summaries[weekKey] = {
        totalHours: timesheet.hours,
        status: timesheet.status,
        documents: timesheet.documents || [],
        description: timesheet.description,
      };
    });

    setWeekSummaries(summaries);
  };

  const fetchTimesheets = async () => {
    console.log('Fetching timesheets for user:', userData?.id);
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      console.log('Date range:', {
        monthStart: format(monthStart, 'yyyy-MM-dd'),
        monthEnd: format(monthEnd, 'yyyy-MM-dd')
      });

      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('user_id', userData?.id)
        .gte('week_ending', format(monthStart, 'yyyy-MM-dd'))
        .lte('week_ending', format(monthEnd, 'yyyy-MM-dd'))
        .order('week_ending', { ascending: false });

      if (error) throw error;
      console.log('Raw timesheet data:', data);

      // Set timesheets state
      setTimesheets(data || []);

      // Calculate monthly stats
      const totalHours = data?.reduce((sum, ts) => {
        console.log('Adding hours from timesheet:', {
          id: ts.id,
          hours: ts.hours,
          currentSum: sum
        });
        return sum + (parseFloat(ts.hours) || 0);
      }, 0) || 0;

      const approvedHours = data?.reduce((sum, ts) => {
        if (ts.status === 'approved') {
          console.log('Adding approved hours:', {
            id: ts.id,
            hours: ts.hours,
            currentSum: sum
          });
          return sum + (parseFloat(ts.hours) || 0);
        }
        return sum;
      }, 0) || 0;

      const pendingHours = data?.reduce((sum, ts) => {
        if (ts.status === 'submitted') {
          console.log('Adding pending hours:', {
            id: ts.id,
            hours: ts.hours,
            currentSum: sum
          });
          return sum + (parseFloat(ts.hours) || 0);
        }
        return sum;
      }, 0) || 0;

      console.log('Calculated stats:', {
        totalHours,
        approvedHours,
        pendingHours,
        timesheetsCount: data?.length || 0
      });

      setMonthlyStats(prev => {
        const newStats = {
          ...prev,
          totalHours,
          approvedHours,
          pendingHours
        };
        console.log('Updated monthly stats:', newStats);
        return newStats;
      });

    } catch (error) {
      console.error('Error fetching timesheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateExpectedHours = () => {
    // Get all weekdays (Mon-Fri) in the current month
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    let workingDays = 0;
    let currentDate = monthStart;

    while (currentDate <= monthEnd) {
      // 0 is Sunday, 6 is Saturday
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate expected hours (8 hours per working day)
    const expectedHours = workingDays * 8;

    setMonthlyStats(prev => ({
      ...prev,
      expectedHours
    }));
  };

  const getWeeksInMonth = () => {
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      // Get the Monday before the first day of the month if month doesn't start on Monday
      const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      
      // Get the Sunday after the last day of the month if month doesn't end on Sunday
      const lastWeekEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

      return eachWeekOfInterval(
        { start: firstWeekStart, end: lastWeekEnd },
        { weekStartsOn: 1 }
      );
    } catch (error) {
      console.error('Error getting weeks:', error);
      return [];
    }
  };

  const getTimesheetForWeek = (weekEnd: Date) => {
    console.log('Checking timesheets:', {
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      availableTimesheets: timesheets.map(ts => ({
        id: ts.id,
        week_ending: ts.week_ending,
        formatted: format(new Date(ts.week_ending), 'yyyy-MM-dd')
      }))
    });

    const timesheet = timesheets.find(ts => {
      const tsWeekEndFormatted = format(new Date(ts.week_ending), 'yyyy-MM-dd');
      const targetWeekEndFormatted = format(weekEnd, 'yyyy-MM-dd');
      
      const isSame = tsWeekEndFormatted === targetWeekEndFormatted;
      console.log('Comparing dates:', {
        tsWeekEnd: tsWeekEndFormatted,
        targetWeekEnd: targetWeekEndFormatted,
        isSame
      });
      
      return isSame;
    });

    console.log('Found timesheet:', timesheet);
    return timesheet;
  };

  const canSubmitTimesheet = (weekEnd: Date) => {
    const today = new Date();
    const existingTimesheet = getTimesheetForWeek(weekEnd);
    
    // Only allow submission if:
    // 1. The week has passed
    // 2. No timesheet exists for this week
    return isAfter(today, weekEnd) && !existingTimesheet;
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setCurrentMonth(direction === 'prev' ? 
      subMonths(currentMonth, 1) : 
      addMonths(currentMonth, 1)
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !userData?.id) return;
    
    const files = Array.from(e.target.files);
    const maxSize = 5 * 1024 * 1024; // 5MB limit

    // Validate file size
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast.error('Some files exceed the 5MB limit');
      return;
    }

    setFormData(prev => ({
      ...prev,
      documents: files,
    }));
  };

  const handleTimesheetClick = (weekEnd: Date) => {
    const weekStart = startOfWeek(weekEnd, { weekStartsOn: 1 });
    const defaultDailyHours: DailyHours = {};
    
    // Set default hours for each workday (Mon-Fri)
    Array.from({ length: 5 }).forEach((_, index) => {
      const currentDay = addDays(weekStart, index);
      defaultDailyHours[format(currentDay, 'yyyy-MM-dd')] = DEFAULT_DAILY_HOURS;
    });

    setSelectedWeekEnd(weekEnd);
    setFormData({
      ...formData,
      weekEnding: format(weekEnd, 'yyyy-MM-dd'),
      dailyHours: defaultDailyHours,
      hours: (DEFAULT_DAILY_HOURS * 5).toString(), // Default to 40 hours
    });
    setShowAddModal(true);
  };

  const handleDailyHoursChange = (date: string, hours: number) => {
    const newDailyHours = {
      ...formData.dailyHours,
      [date]: hours,
    };

    // Calculate total hours
    const totalHours = Object.values(newDailyHours).reduce((sum, h) => sum + h, 0);

    setFormData({
      ...formData,
      dailyHours: newDailyHours,
      hours: totalHours.toString(),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.id || !userData?.organization_id) {
      console.error('Missing user data:', { userData });
      return;
    }

    try {
      setUploading(true);
      
      // First check if timesheet exists for this week
      const { data: existingTimesheet, error: checkError } = await supabase
        .from('timesheets')
        .select('*')
        .eq('user_id', userData.id)
        .eq('week_ending', formData.weekEnding)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingTimesheet) {
        toast.error('A timesheet already exists for this week');
        setShowAddModal(false);
        return; // Exit early if timesheet exists
      }

      // If no existing timesheet, proceed with upload and creation
      const documentUrls = [];

      // Upload documents
      for (const file of formData.documents) {
        console.log('Uploading file:', file.name);
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${userData.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('timesheet-documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('timesheet-documents')
          .getPublicUrl(filePath);

        documentUrls.push(publicUrl);
      }

      // Create timesheet
      const { error: createError } = await supabase
        .from('timesheets')
        .insert({
          user_id: userData.id,
          organization_id: userData.organization_id,
          week_ending: formData.weekEnding,
          hours: parseFloat(formData.hours),
          daily_hours: formData.dailyHours,
          description: formData.description,
          status: 'submitted',
          documents: documentUrls,
        });

      if (createError) {
        // If creation fails, show error and don't close modal or show success
        throw createError;
      }

      // Only if everything succeeds:
      await fetchTimesheets();
      calculateWeekSummaries();
      setShowAddModal(false);
      setFormData({
        weekEnding: format(new Date(), 'yyyy-MM-dd'),
        hours: '',
        description: '',
        documents: [],
        dailyHours: {},
      });
      toast.success('Timesheet submitted successfully');

    } catch (error: any) {
      console.error('Error submitting timesheet:', error);
      // Show specific error message based on error type
      if (error.code === '23505') { // Unique violation
        toast.error('A timesheet already exists for this week');
      } else {
        toast.error('Failed to submit timesheet');
      }
    } finally {
      setUploading(false);
    }
  };

  const fetchPastTimesheets = async () => {
    if (!userData?.id) return;
    try {
      setLoadingPast(true);
      const monthStart = startOfMonth(subMonths(currentMonth, 3)); // Get last 3 months

      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('user_id', userData.id)
        .lt('week_ending', format(monthStart, 'yyyy-MM-dd'))
        .order('week_ending', { ascending: false });

      if (error) throw error;
      setPastTimesheets(data || []);
    } catch (error) {
      console.error('Error fetching past timesheets:', error);
      toast.error('Failed to load past timesheets');
    } finally {
      setLoadingPast(false);
    }
  };

  const getDefaultHours = (weekEnd: Date) => {
    // If it's a past week and no timesheet exists, return default hours
    const today = new Date();
    if (isAfter(today, weekEnd) && !getTimesheetForWeek(weekEnd)) {
      return DEFAULT_WEEKLY_HOURS;
    }
    return '';
  };

  const handleViewDocuments = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    setShowDocumentsModal(true);
  };

  const calculateMonthlyStats = () => {
    console.log('Calculating monthly stats from timesheets:', timesheets);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    // Calculate working days and expected hours
    let workingDays = 0;
    let currentDate = new Date(monthStart);
    while (currentDate <= monthEnd) {
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) { // Not weekend
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    const expectedHours = workingDays * 8;

    // Get all timesheets for the current month
    const monthlyTimesheets = timesheets.filter(ts => {
      const tsDate = new Date(ts.week_ending);
      return tsDate >= monthStart && tsDate <= monthEnd;
    });

    // Calculate total hours
    const totalHours = monthlyTimesheets.reduce((sum, ts) => {
      console.log('Adding timesheet hours:', {
        weekEnding: ts.week_ending,
        hours: ts.hours,
        currentSum: sum
      });
      return sum + Number(ts.hours);
    }, 0);

    // Calculate approved and pending hours
    const approvedHours = monthlyTimesheets
      .filter(ts => ts.status === 'approved')
      .reduce((sum, ts) => sum + Number(ts.hours), 0);

    const pendingHours = monthlyTimesheets
      .filter(ts => ts.status === 'submitted')
      .reduce((sum, ts) => sum + Number(ts.hours), 0);

    console.log('Final monthly stats:', {
      totalHours,
      approvedHours,
      pendingHours,
      expectedHours,
      workingDays,
      timesheets: monthlyTimesheets
    });

    setMonthlyStats({
      expectedHours,
      totalHours,
      approvedHours,
      pendingHours
    });
  };

  // Update useEffect to call calculateMonthlyStats
  useEffect(() => {
    if (userData?.id) {
      console.log('Initial load - fetching timesheets');
      fetchTimesheets();
      calculateExpectedHours();
    }
  }, [userData?.id, currentMonth]);

  useEffect(() => {
    if (timesheets.length > 0) {
      calculateMonthlyStats();
      calculateWeekSummaries();
    }
  }, [timesheets, currentMonth]);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-500/10 rounded-lg">
                <Clock className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <h3 className="text-sm text-white/70">Expected Hours</h3>
                <p className="text-2xl font-semibold">
                  {monthlyStats.expectedHours} hrs
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h3 className="text-sm text-white/70">Approved Hours</h3>
                <p className="text-2xl font-semibold">
                  {monthlyStats.approvedHours} hrs
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <AlertCircle className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-sm text-white/70">Pending Hours</h3>
                <p className="text-2xl font-semibold">
                  {monthlyStats.pendingHours} hrs
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <BarChart2 className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm text-white/70">Total Hours</h3>
                <p className="text-2xl font-semibold">
                  {monthlyStats.totalHours} hrs
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'calendar' ? 'bg-primary-500 text-white' : 'bg-glass-light hover:bg-glass-medium'
              }`}
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-primary-500 text-white' : 'bg-glass-light hover:bg-glass-medium'
              }`}
            >
              <FileText className="w-4 h-4" />
            </button>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-glass-light px-4 py-2 rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => handleMonthChange('prev')}
              className="p-2 hover:bg-glass-light rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold min-w-[150px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <button
              onClick={() => handleMonthChange('next')}
              className="p-2 hover:bg-glass-light rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calendar View */}
        {viewMode === 'calendar' ? (
          <div className="glass-card p-6">
            <div className="grid grid-cols-7 gap-4 mb-4">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-center text-sm text-white/70">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-4">
              {getWeeksInMonth().map(weekStart => {
                const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                const days = Array.from({ length: 7 }).map((_, index) => {
                  const currentDay = addDays(weekStart, index);
                  return {
                    date: currentDay,
                    isCurrentMonth: isSameMonth(currentDay, currentMonth),
                    hasTimesheet: timesheets.some(ts => 
                      format(new Date(ts.week_ending), 'yyyy-MM-dd') === format(weekEnd, 'yyyy-MM-dd')
                    ),
                    timesheet: timesheets.find(ts => 
                      format(new Date(ts.week_ending), 'yyyy-MM-dd') === format(weekEnd, 'yyyy-MM-dd')
                    )
                  };
                });

                return days.map(({ date, isCurrentMonth, hasTimesheet, timesheet }) => (
                  <div
                    key={format(date, 'yyyy-MM-dd')}
                    className={`aspect-square p-2 rounded-lg ${
                      isCurrentMonth
                        ? 'bg-glass-light'
                        : 'bg-glass-light/50'
                    } ${
                      hasTimesheet && isSameDay(date, weekEnd)
                        ? getStatusColor(timesheet?.status || 'submitted')
                        : ''
                    } relative group`}
                  >
                    <div className="text-sm mb-1 font-medium flex justify-between items-center">
                      <span>{format(date, 'd')}</span>
                      {timesheet?.daily_hours?.[format(date, 'yyyy-MM-dd')] && (
                        <span className="text-xs bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded-full">
                          {timesheet.daily_hours[format(date, 'yyyy-MM-dd')]}h
                        </span>
                      )}
                    </div>
                    
                    {isSameDay(date, weekEnd) && (
                      <div className="absolute bottom-2 right-2 left-2">
                        {hasTimesheet ? (
                          <div className="text-center px-2 py-1 rounded-full text-xs">
                            <div className={`flex items-center justify-center gap-1 ${
                              timesheet?.status === 'approved'
                                ? 'bg-green-500/20 text-green-400'
                                : timesheet?.status === 'rejected'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {timesheet?.status === 'approved' ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : timesheet?.status === 'rejected' ? (
                                <XCircle className="w-3 h-3" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )}
                              <span>
                                {timesheet?.status.charAt(0).toUpperCase() + timesheet?.status.slice(1)}
                              </span>
                            </div>
                          </div>
                        ) : isAfter(date, new Date()) ? (
                          <div className="text-center text-xs text-white/50">
                            Not yet available
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTimesheetClick(weekEnd);
                            }}
                            className="w-full text-xs py-1 px-2 bg-primary-500 hover:bg-primary-400 
                              text-white rounded-full transition-colors duration-200 
                              flex items-center justify-center gap-1 group"
                          >
                            <Plus className="w-3 h-3 group-hover:rotate-90 transition-transform duration-200" />
                            <span>Submit</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ));
              })}
            </div>
          </div>
        ) : (
          // List View
          <div className="glass-card p-6">
            <div className="space-y-4">
              {getWeeksInMonth().map(weekEnd => {
                const summary = weekSummaries[format(weekEnd, 'yyyy-MM-dd')];
                if (selectedStatus !== 'all' && summary?.status !== selectedStatus) {
                  return null;
                }

                return (
                  <motion.div
                    key={weekEnd.toISOString()}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-card p-4"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary-400" />
                          <span>Week Ending: {format(weekEnd, 'MMM d, yyyy')}</span>
                        </div>
                        {summary && (
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="w-4 h-4 text-white/50" />
                            <span>{summary.totalHours} hours</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        {summary ? (
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              summary.status === 'approved'
                                ? 'bg-green-400/10 text-green-400'
                                : summary.status === 'rejected'
                                ? 'bg-red-400/10 text-red-400'
                                : 'bg-yellow-400/10 text-yellow-400'
                            }`}
                          >
                            {summary.status.charAt(0).toUpperCase() + summary.status.slice(1)}
                          </span>
                        ) : canSubmitTimesheet(weekEnd) ? (
                          <button
                            onClick={() => handleTimesheetClick(weekEnd)}
                            className="btn-primary flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Submit Timesheet
                          </button>
                        ) : (
                          <span className="text-sm text-white/50">
                            Not yet available
                          </span>
                        )}
                      </div>
                    </div>

                    {summary?.description && (
                      <p className="mt-4 text-white/70">{summary.description}</p>
                    )}

                    {summary?.documents && summary.documents.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Attached Documents:</h4>
                        <div className="flex flex-wrap gap-2">
                          {summary.documents.map((doc, index) => (
                            <a
                              key={index}
                              href={doc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-1 bg-glass-light rounded-lg hover:bg-glass-medium transition-colors"
                            >
                              <FileText className="w-4 h-4" />
                              <span>Document {index + 1}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Timesheet Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title={`Submit Timesheet for Week Ending ${selectedWeekEnd ? format(selectedWeekEnd, 'MMM d, yyyy') : ''}`}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Daily Hours Input */}
            <div>
              <label className="block text-sm text-white/70 mb-4">Daily Hours</label>
              <div className="space-y-4">
                {selectedWeekEnd && Array.from({ length: 5 }).map((_, index) => {
                  const currentDay = addDays(startOfWeek(selectedWeekEnd, { weekStartsOn: 1 }), index);
                  const dateKey = format(currentDay, 'yyyy-MM-dd');
                  
                  return (
                    <div key={dateKey} className="flex items-center gap-4">
                      <div className="w-32">
                        <span className="text-sm">{format(currentDay, 'EEE, MMM d')}</span>
                      </div>
                      <input
                        type="number"
                        value={formData.dailyHours[dateKey] || ''}
                        onChange={(e) => handleDailyHoursChange(dateKey, parseFloat(e.target.value) || 0)}
                        className="input-field w-24"
                        min="0"
                        max="24"
                        step="0.5"
                        placeholder="0"
                      />
                      <span className="text-sm text-white/70">hours</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 text-right">
                <span className="text-sm text-white/70">
                  Total Hours: {formData.hours || '0'}
                </span>
              </div>
            </div>

            {/* Rest of the form */}
            <div>
              <label className="block text-sm text-white/70 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                rows={3}
                placeholder="Describe your work for the week..."
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Documents</label>
              <div className="flex items-center gap-4">
                <label className="flex-1">
                  <div className="relative">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      multiple
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-white/20 rounded-lg hover:border-white/40 transition-colors">
                      <Upload className="w-4 h-4" />
                      <span>Choose files or drag & drop</span>
                    </div>
                  </div>
                </label>
              </div>
              {formData.documents.length > 0 && (
                <div className="mt-2 space-y-1">
                  {formData.documents.map((file, index) => (
                    <div key={index} className="text-sm text-white/70">
                      {file.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-glass-light rounded-lg hover:bg-glass-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={uploading}
              >
                {uploading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  'Submit Timesheet'
                )}
              </button>
            </div>
          </form>
        </Modal>

        {/* Add Documents Modal */}
        {selectedTimesheet && (
          <DocumentsModal
            isOpen={showDocumentsModal}
            onClose={() => {
              setShowDocumentsModal(false);
              setSelectedTimesheet(null);
            }}
            documents={selectedTimesheet.documents || []}
            weekEnding={selectedTimesheet.week_ending}
          />
        )}
      </div>
    </PageTransition>
  );
};

// Helper function for status colors
const getStatusColor = (status: Timesheet['status']) => {
  switch (status) {
    case 'approved':
      return 'bg-green-500/10 border border-green-500/20';
    case 'rejected':
      return 'bg-red-500/10 border border-red-500/20';
    case 'submitted':
      return 'bg-yellow-500/10 border border-yellow-500/20';
    default:
      return 'bg-blue-500/10 border border-blue-500/20';
  }
};

// Helper function to add days
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Helper function to check if dates are in same month
const isSameMonth = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  );
};

export default Timesheets;