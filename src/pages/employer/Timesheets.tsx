import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import PageTransition from '../../components/shared/PageTransition';
import { format } from 'date-fns';

interface Timesheet {
  id: string;
  employeeName: string;
  period: string;
  hoursLogged: number;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

const mockTimesheets: Timesheet[] = [
  {
    id: '1',
    employeeName: 'John Doe',
    period: '2024-03-01 to 2024-03-15',
    hoursLogged: 80,
    status: 'pending',
    submittedAt: '2024-03-15T10:30:00',
  },
  {
    id: '2',
    employeeName: 'Jane Smith',
    period: '2024-03-01 to 2024-03-15',
    hoursLogged: 76,
    status: 'approved',
    submittedAt: '2024-03-14T16:45:00',
  },
];

const Timesheets = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const filteredTimesheets = mockTimesheets.filter(
    (timesheet) =>
      timesheet.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filter === 'all' || timesheet.status === filter)
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Timesheets</h1>
            <p className="text-white/70 mt-2">Review and approve employee timesheets</p>
          </div>
        </div>

        <div className="glass-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
              <input
                type="text"
                placeholder="Search by employee name..."
                className="w-full pl-10 pr-4 py-2 bg-glass-light rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 bg-glass-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-white/70 border-b border-glass-light">
                  <th className="text-left py-4">Employee</th>
                  <th className="text-left py-4">Period</th>
                  <th className="text-left py-4">Hours</th>
                  <th className="text-left py-4">Submitted</th>
                  <th className="text-left py-4">Status</th>
                  <th className="text-left py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTimesheets.map((timesheet) => (
                  <motion.tr
                    key={timesheet.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-glass-light"
                  >
                    <td className="py-4">{timesheet.employeeName}</td>
                    <td className="py-4">{timesheet.period}</td>
                    <td className="py-4">{timesheet.hoursLogged}h</td>
                    <td className="py-4">
                      {format(new Date(timesheet.submittedAt), 'MMM d, yyyy')}
                    </td>
                    <td className="py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          timesheet.status === 'pending'
                            ? 'bg-yellow-400/10 text-yellow-400'
                            : timesheet.status === 'approved'
                            ? 'bg-green-400/10 text-green-400'
                            : 'bg-red-400/10 text-red-400'
                        }`}
                      >
                        {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        <button
                          className="p-1 hover:text-green-400 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          className="p-1 hover:text-red-400 transition-colors"
                          title="Reject"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Timesheets;