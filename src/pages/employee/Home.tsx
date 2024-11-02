import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Building2, Briefcase, Calendar } from 'lucide-react';
import StatCard from '../../components/shared/StatCard';

const EmployeeHome = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <p className="text-white/70 mt-2">Welcome back, John Doe!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Hours This Month"
          value="164"
          icon={Clock}
          trend={{ value: 5, isPositive: true }}
        />
        <StatCard
          title="Current Client"
          value="Tech Corp"
          icon={Building2}
        />
        <StatCard
          title="Active Projects"
          value={3}
          icon={Briefcase}
        />
        <StatCard
          title="Days Till Review"
          value={14}
          icon={Calendar}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { date: '2024-03-15', action: 'Timesheet submitted for week 11' },
              { date: '2024-03-14', action: 'Project milestone completed' },
              { date: '2024-03-13', action: 'Client meeting scheduled' },
            ].map((activity, index) => (
              <div
                key={index}
                className="flex items-center gap-4 text-white/70"
              >
                <div className="w-2 h-2 rounded-full bg-primary-400" />
                <span className="text-sm">{activity.date}</span>
                <span>{activity.action}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <h2 className="text-xl font-semibold mb-4">Upcoming Tasks</h2>
          <div className="space-y-4">
            {[
              { date: '2024-03-18', task: 'Submit weekly timesheet' },
              { date: '2024-03-20', task: 'Client presentation' },
              { date: '2024-03-22', task: 'Project review meeting' },
            ].map((task, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-glass-light"
              >
                <span>{task.task}</span>
                <span className="text-sm text-white/70">{task.date}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EmployeeHome;