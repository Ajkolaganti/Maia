import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  Building2,
  MapPin,
  Briefcase,
  Loader,
  BarChart2,
} from 'lucide-react';
import PageTransition from '../../components/shared/PageTransition';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import StatCard from '../../components/shared/StatCard';
import { startOfMonth, endOfMonth, differenceInWeeks } from 'date-fns';
import { format } from 'date-fns';

interface DashboardStats {
  totalHours: number;
  pendingTimesheets: number;
  approvedTimesheets: number;
  totalEarnings: number;
}

interface ClientInfo {
  id: string;
  name: string;
  location: string;
  industry: string;
}

const EmployeeHome = () => {
  const { userData } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalHours: 0,
    pendingTimesheets: 0,
    approvedTimesheets: 0,
    totalEarnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [loadingClient, setLoadingClient] = useState(true);
  const [currentMonthStats, setCurrentMonthStats] = useState({
    totalHours: 0,
    approvedHours: 0,
    pendingHours: 0,
    averageHoursPerWeek: 0
  });

  useEffect(() => {
    if (userData?.id) {
      fetchDashboardStats();
      fetchClientInfo();
      fetchCurrentMonthStats();
    }
  }, [userData?.id]);

  const fetchDashboardStats = async () => {
    try {
      const { data: timesheets, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('user_id', userData?.id);

      if (error) throw error;

      const totalHours = timesheets?.reduce((sum, ts) => {
        const dailyHours = typeof ts.hours === 'string' 
          ? JSON.parse(ts.hours) 
          : ts.hours;
        
        return sum + Object.values(dailyHours).reduce((daySum: number, day: any) => {
          const [h, m] = (day.standard || '0:0').split(':').map(Number);
          return daySum + h + (m / 60);
        }, 0);
      }, 0) || 0;

      const pendingTimesheets = timesheets?.filter(ts => ts.status === 'submitted').length || 0;
      const approvedTimesheets = timesheets?.filter(ts => ts.status === 'approved').length || 0;

      setStats({
        totalHours: Math.round(totalHours * 100) / 100,
        pendingTimesheets,
        approvedTimesheets,
        totalEarnings: 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientInfo = async () => {
    if (!userData?.client_id) {
      setLoadingClient(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, location, industry')
        .eq('id', userData.client_id)
        .single();

      if (error) throw error;
      setClientInfo(data);
    } catch (error) {
      console.error('Error fetching client info:', error);
    } finally {
      setLoadingClient(false);
    }
  };

  const fetchCurrentMonthStats = async () => {
    try {
      const startOfCurrentMonth = startOfMonth(new Date());
      const endOfCurrentMonth = endOfMonth(new Date());

      const { data: timesheets, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('user_id', userData?.id)
        .gte('week_starting', format(startOfCurrentMonth, 'yyyy-MM-dd'))
        .lte('week_ending', format(endOfCurrentMonth, 'yyyy-MM-dd'));

      if (error) throw error;

      const calculateHoursFromTimesheet = (ts: any) => {
        const dailyHours = typeof ts.hours === 'string' 
          ? JSON.parse(ts.hours) 
          : ts.hours;
        
        return Object.values(dailyHours).reduce((sum: number, day: any) => {
          const [h, m] = (day.standard || '0:0').split(':').map(Number);
          return sum + h + (m / 60);
        }, 0);
      };

      const totalHours = timesheets?.reduce((sum, ts) => 
        sum + calculateHoursFromTimesheet(ts), 0) || 0;

      const approvedHours = timesheets?.reduce((sum, ts) => 
        ts.status === 'approved' ? sum + calculateHoursFromTimesheet(ts) : sum, 0) || 0;

      const pendingHours = timesheets?.reduce((sum, ts) => 
        ts.status === 'submitted' ? sum + calculateHoursFromTimesheet(ts) : sum, 0) || 0;

      const weeksInMonth = differenceInWeeks(endOfCurrentMonth, startOfCurrentMonth) + 1;
      const averageHoursPerWeek = totalHours / weeksInMonth;

      setCurrentMonthStats({
        totalHours: Math.round(totalHours * 100) / 100,
        approvedHours: Math.round(approvedHours * 100) / 100,
        pendingHours: Math.round(pendingHours * 100) / 100,
        averageHoursPerWeek: Math.round(averageHoursPerWeek * 100) / 100
      });
    } catch (error) {
      console.error('Error fetching current month stats:', error);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {userData?.first_name}!</h1>
          <p className="text-white/70 mt-2">
            Current Month: {format(new Date(), 'MMMM yyyy')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Hours This Month"
            value={currentMonthStats.totalHours}
            icon={Clock}
            suffix="hrs"
            loading={loading}
            link="/employee/timesheets"
          />
          <StatCard
            title="Approved Hours"
            value={currentMonthStats.approvedHours}
            icon={CheckCircle}
            suffix="hrs"
            loading={loading}
            link="/employee/timesheets?status=approved"
          />
          <StatCard
            title="Pending Hours"
            value={currentMonthStats.pendingHours}
            icon={AlertCircle}
            suffix="hrs"
            loading={loading}
            link="/employee/timesheets?status=submitted"
          />
          <StatCard
            title="Average Hours/Week"
            value={Math.round(currentMonthStats.averageHoursPerWeek)}
            icon={BarChart2}
            suffix="hrs"
            loading={loading}
            link="/employee/timesheets"
          />
        </div>

        {/* Client Status */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4">Current Status</h2>
          {loadingClient ? (
            <div className="flex justify-center">
              <Loader className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : clientInfo ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary-400" />
                <div>
                  <p className="font-medium">{clientInfo.name}</p>
                  <p className="text-sm text-white/70">Current Client</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-white/70">Location</p>
                  <p>{clientInfo.location}</p>
                </div>
                <div>
                  <p className="text-sm text-white/70">Industry</p>
                  <p>{clientInfo.industry}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-lg font-medium">Currently on Bench</p>
              <p className="text-white/70 mt-2">Not assigned to any client project</p>
            </div>
          )}
        </div>

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
            title="Total Earnings"
            value={stats.totalEarnings}
            icon={DollarSign}
            prefix="$"
            loading={loading}
            link="/employee/profile"
          />
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {/* Add recent timesheet submissions, approvals, etc. */}
          </div>
        </div>

        {/* Calendar View */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4">Work Schedule</h2>
          <div className="h-[400px]">
            {/* Add calendar component showing timesheet submissions */}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default EmployeeHome;