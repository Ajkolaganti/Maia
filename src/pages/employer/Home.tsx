import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Building2,
  DollarSign,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader,
  BarChart2,
} from 'lucide-react';
import PageTransition from '../../components/shared/PageTransition';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import StatCard from '../../components/shared/StatCard';

interface DashboardStats {
  totalEmployees: number;
  activeClients: number;
  totalRevenue: number;
  pendingTimesheets: number;
  approvedTimesheets: number;
  totalHours: number;
  averageHoursPerEmployee: number;
  clientSatisfactionRate: number;
}

const EmployerHome = () => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeClients: 0,
    totalRevenue: 0,
    pendingTimesheets: 0,
    approvedTimesheets: 0,
    totalHours: 0,
    averageHoursPerEmployee: 0,
    clientSatisfactionRate: 0,
  });

  useEffect(() => {
    if (userData?.organization_id) {
      fetchDashboardStats();
    }
  }, [userData?.organization_id]);

  const fetchDashboardStats = async () => {
    try {
      const [
        employeesData,
        clientsData,
        timesheetsData,
        invoicesData
      ] = await Promise.all([
        // Get employees count
        supabase
          .from('users')
          .select('id', { count: 'exact' })
          .eq('organization_id', userData?.organization_id)
          .eq('role', 'employee'),

        // Get active clients
        supabase
          .from('clients')
          .select('id', { count: 'exact' })
          .eq('organization_id', userData?.organization_id)
          .eq('status', 'active'),

        // Get timesheets
        supabase
          .from('timesheets')
          .select('*')
          .eq('organization_id', userData?.organization_id),

        // Get invoices
        supabase
          .from('invoices')
          .select('*')
          .eq('organization_id', userData?.organization_id)
      ]);

      const totalEmployees = employeesData.count || 0;
      const activeClients = clientsData.count || 0;
      const timesheets = timesheetsData.data || [];
      const invoices = invoicesData.data || [];

      // Calculate timesheet stats
      const totalHours = timesheets.reduce((sum, ts) => sum + (ts.hours || 0), 0);
      const pendingTimesheets = timesheets.filter(ts => ts.status === 'submitted').length;
      const approvedTimesheets = timesheets.filter(ts => ts.status === 'approved').length;
      const averageHoursPerEmployee = totalEmployees ? totalHours / totalEmployees : 0;

      // Calculate total revenue
      const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

      setStats({
        totalEmployees,
        activeClients,
        totalRevenue,
        pendingTimesheets,
        approvedTimesheets,
        totalHours,
        averageHoursPerEmployee,
        clientSatisfactionRate: 0, // This would need a separate implementation
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-white/70 mt-2">Overview of your organization</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Employees"
            value={stats.totalEmployees}
            icon={Users}
            loading={loading}
            link="/employer/employees"
          />
          <StatCard
            title="Active Clients"
            value={stats.activeClients}
            icon={Building2}
            loading={loading}
            link="/employer/clients"
          />
          <StatCard
            title="Total Revenue"
            value={stats.totalRevenue}
            icon={DollarSign}
            prefix="$"
            loading={loading}
            link="/employer/invoices"
          />
          <StatCard
            title="Total Hours"
            value={stats.totalHours}
            icon={Clock}
            suffix="hrs"
            loading={loading}
            link="/employer/timesheets"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Pending Timesheets"
            value={stats.pendingTimesheets}
            icon={AlertCircle}
            loading={loading}
            link="/employer/timesheets?status=submitted"
          />
          <StatCard
            title="Approved Timesheets"
            value={stats.approvedTimesheets}
            icon={CheckCircle}
            loading={loading}
            link="/employer/timesheets?status=approved"
          />
          <StatCard
            title="Avg Hours/Employee"
            value={Math.round(stats.averageHoursPerEmployee)}
            icon={BarChart2}
            suffix="hrs"
            loading={loading}
            link="/employer/timesheets"
          />
          <StatCard
            title="Client Satisfaction"
            value={stats.clientSatisfactionRate}
            icon={Building2}
            suffix="%"
            loading={loading}
            link="/employer/clients"
          />
        </div>
      </div>
    </PageTransition>
  );
};

export default EmployerHome;