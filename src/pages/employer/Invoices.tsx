import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  FileText,
  Download,
  Send,
  DollarSign,
  Calendar,
} from 'lucide-react';
import PageTransition from '../../components/shared/PageTransition';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  client: string;
  amount: number;
  dueDate: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue';
  items: Array<{
    description: string;
    hours: number;
    rate: number;
  }>;
}

const mockInvoices: Invoice[] = [
  {
    id: 'INV-2024-001',
    client: 'Tech Corp',
    amount: 12500,
    dueDate: '2024-03-30',
    status: 'pending',
    items: [
      { description: 'Frontend Development', hours: 45, rate: 150 },
      { description: 'Backend Integration', hours: 35, rate: 175 },
    ],
  },
  {
    id: 'INV-2024-002',
    client: 'Design Studio',
    amount: 8750,
    dueDate: '2024-03-25',
    status: 'draft',
    items: [
      { description: 'UI/UX Design', hours: 35, rate: 125 },
      { description: 'Design System Updates', hours: 35, rate: 125 },
    ],
  },
];

const Invoices = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'draft' | 'pending' | 'paid' | 'overdue'>('all');

  const filteredInvoices = mockInvoices.filter(
    (invoice) =>
      (invoice.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.id.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filter === 'all' || invoice.status === filter)
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Invoices</h1>
            <p className="text-white/70 mt-2">Manage and track your invoices</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Invoice
          </motion.button>
        </div>

        <div className="glass-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
              <input
                type="text"
                placeholder="Search invoices..."
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
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div className="space-y-4">
            {filteredInvoices.map((invoice) => (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-glass-light rounded-xl p-4"
              >
                <div className="flex flex-wrap gap-4 justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-primary-400" />
                      <h3 className="font-semibold">{invoice.id}</h3>
                    </div>
                    <p className="text-white/70 mt-1">{invoice.client}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">${invoice.amount.toLocaleString()}</p>
                      <p className="text-sm text-white/70">
                        Due {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        invoice.status === 'paid'
                          ? 'bg-green-400/10 text-green-400'
                          : invoice.status === 'pending'
                          ? 'bg-yellow-400/10 text-yellow-400'
                          : invoice.status === 'overdue'
                          ? 'bg-red-400/10 text-red-400'
                          : 'bg-glass-medium text-white/70'
                      }`}
                    >
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-glass-medium">
                  <div className="flex flex-wrap gap-4">
                    <button className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                      <Download className="w-4 h-4" />
                      Download PDF
                    </button>
                    <button className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                      <Send className="w-4 h-4" />
                      Send to Client
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Invoices;