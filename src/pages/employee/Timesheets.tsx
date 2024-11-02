import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Upload, Calendar, FileText } from 'lucide-react';
import PageTransition from '../../components/shared/PageTransition';
import { format } from 'date-fns';

interface TimeEntry {
  id: string;
  date: string;
  hours: number;
  description: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
}

const mockTimeEntries: TimeEntry[] = [
  {
    id: '1',
    date: '2024-03-15',
    hours: 8,
    description: 'Frontend development and bug fixes',
    status: 'approved',
  },
  {
    id: '2',
    date: '2024-03-14',
    hours: 7.5,
    description: 'Client meeting and feature planning',
    status: 'submitted',
  },
];

const EmployeeTimesheets = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle timesheet submission
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Timesheets</h1>
          <p className="text-white/70 mt-2">Submit and manage your time entries</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
            <h2 className="text-xl font-semibold mb-4">Submit Time Entry</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Date</label>
                <input
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="w-full px-4 py-2 bg-glass-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">Hours Worked</label>
                <input
                  type="number"
                  step="0.5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full px-4 py-2 bg-glass-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter hours worked"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-glass-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 h-24 resize-none"
                  placeholder="Describe your work"
                />
              </div>
              <div className="space-y-4">
                <div className="glass-card p-4">
                  <label className="block text-sm text-white/70 mb-2">Supporting Documents</label>
                  <div className="border-2 border-dashed border-glass-light rounded-lg p-4 text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-white/70" />
                    <p className="text-white/70">Drag and drop files here or click to browse</p>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="btn-primary flex items-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  Submit Entry
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  className="px-4 py-2 bg-glass-light rounded-lg hover:bg-glass-medium transition-colors"
                >
                  Save Draft
                </motion.button>
              </div>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
            <h2 className="text-xl font-semibold mb-4">Recent Entries</h2>
            <div className="space-y-4">
              {mockTimeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 bg-glass-light rounded-lg space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary-400" />
                      <span>{format(new Date(entry.date), 'MMM d, yyyy')}</span>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        entry.status === 'approved'
                          ? 'bg-green-400/10 text-green-400'
                          : entry.status === 'rejected'
                          ? 'bg-red-400/10 text-red-400'
                          : 'bg-yellow-400/10 text-yellow-400'
                      }`}
                    >
                      {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    <Clock className="w-4 h-4" />
                    <span>{entry.hours} hours</span>
                  </div>
                  <p className="text-sm text-white/70">{entry.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default EmployeeTimesheets;