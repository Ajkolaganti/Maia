import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  DollarSign,
  Loader,
  BarChart2,
} from 'lucide-react';
import PageTransition from '../../components/shared/PageTransition';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import StatCard from '../../components/shared/StatCard';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface TimesheetSummary {
  week_starting: string;
  week_ending: string;
  status: string;
  rejection_reason?: string;
}

interface DashboardStats {
  totalHours: number;
  pendingTimesheets: number;
  approvedTimesheets: number;
  rejectedTimesheets: number;
  totalEarnings: number;
  currentMonthHours: number;
  currentMonthApproved: number;
  currentMonthPending: number;
  currentMonthRejected: number;
  pendingTimesheetWeeks: TimesheetSummary[];
  rejectedTimesheetWeeks: TimesheetSummary[];
}

const EmployeeHome = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalHours: 0,
    pendingTimesheets: 0,
    approvedTimesheets: 0,
    rejectedTimesheets: 0,
    totalEarnings: 0,
    currentMonthHours: 0,
    currentMonthApproved: 0,
    currentMonthPending: 0,
    currentMonthRejected: 0,
    pendingTimesheetWeeks: [],
    rejectedTimesheetWeeks: []
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const currentDate = new Date();
      const monthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd');

      // Fetch all timesheets
      const { data: timesheets, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('user_id', userData?.id);

      if (error) throw error;

      const pendingWeeks: TimesheetSummary[] = [];
      const rejectedWeeks: TimesheetSummary[] = [];

      // Calculate total stats with null checks
      const totalStats = (timesheets || []).reduce((acc, timesheet) => {
        try {
          // Safely parse hours
          let hours = {};
          if (timesheet.hours) {
            hours = typeof timesheet.hours === 'string' 
              ? JSON.parse(timesheet.hours) 
              : timesheet.hours;
          }

          // Calculate total hours with null checks
          const totalHours = Object.values(hours || {}).reduce((sum: number, day: any) => {
            if (!day?.standard) return sum;
            const [h, m] = (day.standard || '0:0').split(':').map(Number);
            return sum + (h || 0) + ((m || 0) / 60);
          }, 0);

          // Update status counts
          if (timesheet.status === 'submitted') acc.pendingTimesheets++;
          if (timesheet.status === 'approved') acc.approvedTimesheets++;
          if (timesheet.status === 'rejected') acc.rejectedTimesheets++;

          // Add to total hours if approved
          if (timesheet.status === 'approved') {
            acc.totalHours += totalHours;
          }

          // Check if timesheet is from current month
          const timesheetDate = new Date(timesheet.week_ending);
          if (timesheetDate >= new Date(monthStart) && timesheetDate <= new Date(monthEnd)) {
            acc.currentMonthHours += totalHours;
            if (timesheet.status === 'approved') acc.currentMonthApproved++;
            if (timesheet.status === 'submitted') acc.currentMonthPending++;
            if (timesheet.status === 'rejected') acc.currentMonthRejected++;
          }

          // Track pending and rejected weeks
          if (timesheet.status === 'submitted') {
            pendingWeeks.push({
              week_starting: timesheet.week_starting,
              week_ending: timesheet.week_ending,
              status: 'submitted'
            });
          }
          if (timesheet.status === 'rejected') {
            rejectedWeeks.push({
              week_starting: timesheet.week_starting,
              week_ending: timesheet.week_ending,
              status: 'rejected',
              rejection_reason: timesheet.rejection_reason
            });
          }

          return acc;
        } catch (err) {
          console.error('Error processing timesheet:', err);
          return acc;
        }
      }, {
        totalHours: 0,
        pendingTimesheets: 0,
        approvedTimesheets: 0,
        rejectedTimesheets: 0,
        currentMonthHours: 0,
        currentMonthApproved: 0,
        currentMonthPending: 0,
        currentMonthRejected: 0,
        totalEarnings: 0,
        pendingTimesheetWeeks: pendingWeeks,
        rejectedTimesheetWeeks: rejectedWeeks
      });

      setStats(totalStats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleWeekClick = (weekStarting: string) => {
    navigate(`/employee/timesheets?week=${weekStarting}`);
  };

  useEffect(() => {
    if (userData?.id) {
      fetchDashboardStats();
    }
  }, [userData?.id]);

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-white/70 mt-2">Welcome back, {userData?.first_name}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Hours"
            value={stats.totalHours}
            icon={Clock}
            suffix="hrs"
            loading={loading}
            link="/employee/timesheets"
          />
          <StatCard
            title="Pending Timesheets"
            value={stats.pendingTimesheets}
            icon={AlertCircle}
            loading={loading}
            link="/employee/timesheets?status=submitted"
          />
          <StatCard
            title="Approved Timesheets"
            value={stats.approvedTimesheets}
            icon={CheckCircle}
            loading={loading}
            link="/employee/timesheets?status=approved"
          />
          <StatCard
            title="Rejected Timesheets"
            value={stats.rejectedTimesheets}
            icon={XCircle}
            loading={loading}
            link="/employee/timesheets?status=rejected"
          />
        </div>

        {/* Current Month Stats */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4">Current Month Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-white/70">Total Hours</p>
              <p className="text-2xl font-semibold">{stats.currentMonthHours.toFixed(2)}hrs</p>
            </div>
            <div>
              <p className="text-white/70">Pending</p>
              <p className="text-2xl font-semibold text-yellow-400">{stats.currentMonthPending}</p>
            </div>
            <div>
              <p className="text-white/70">Approved</p>
              <p className="text-2xl font-semibold text-green-400">{stats.currentMonthApproved}</p>
            </div>
            <div>
              <p className="text-white/70">Rejected</p>
              <p className="text-2xl font-semibold text-red-400">{stats.currentMonthRejected}</p>
            </div>
          </div>
        </div>

        {/* Pending Timesheets Section */}
        {stats.pendingTimesheetWeeks.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 text-yellow-400">Pending Timesheets</h2>
            <div className="space-y-3">
              {stats.pendingTimesheetWeeks.map((week) => (
                <div
                  key={week.week_starting}
                  onClick={() => handleWeekClick(week.week_starting)}
                  className="p-4 bg-yellow-400/10 rounded-lg cursor-pointer hover:bg-yellow-400/20 transition-colors"
                >
                  <p className="font-medium">
                    Week of {format(new Date(week.week_starting), 'MMM d')} - {format(new Date(week.week_ending), 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm text-yellow-400">Awaiting Approval</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rejected Timesheets Section */}
        {stats.rejectedTimesheetWeeks.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 text-red-400">Rejected Timesheets</h2>
            <div className="space-y-3">
              {stats.rejectedTimesheetWeeks.map((week) => (
                <div
                  key={week.week_starting}
                  onClick={() => handleWeekClick(week.week_starting)}
                  className="p-4 bg-red-400/10 rounded-lg cursor-pointer hover:bg-red-400/20 transition-colors"
                >
                  <p className="font-medium">
                    Week of {format(new Date(week.week_starting), 'MMM d')} - {format(new Date(week.week_ending), 'MMM d, yyyy')}
                  </p>
                  {week.rejection_reason && (
                    <p className="text-sm text-red-400 mt-1">
                      Reason: {week.rejection_reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default EmployeeHome;