import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  FileText,
  Download,
  Send,
  DollarSign,
  Calendar,
  Building2,
  Loader,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
} from 'lucide-react';
import PageTransition from '../../components/shared/PageTransition';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/shared/Modal';
import { supabase } from '../../config/supabase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface InvoiceItem {
  id: string;
  description: string;
  hours: number;
  rate: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client: {
    name: string;
    email: string;
    billing_address: string;
  };
  issue_date: string;
  due_date: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue';
  subtotal: number;
  tax: number;
  total: number;
  items: InvoiceItem[];
  notes?: string;
  sent_at?: string | null;
}

interface InvoiceFormData {
  clientId: string;
  issueDate: string;
  dueDate: string;
  items: {
    description: string;
    hours: number;
    rate: number;
    amount: number;
  }[];
  notes: string;
  taxPercentage: number;
}

interface ClientInvoiceSummary {
  client_id: string;
  client_name: string;
  total_invoices: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  overdue_amount: number;
  invoices: Invoice[];
}

interface TimesheetSelection {
  id: string;
  week_ending: string;
  total_hours: number;
  documents: string[];
  selected: boolean;
}

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'MMM d, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

const Invoices = () => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clientSummaries, setClientSummaries] = useState<ClientInvoiceSummary[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientInvoiceSummary | null>(null);
  const [showClientInvoices, setShowClientInvoices] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [processing, setProcessing] = useState(false);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [availableTimesheets, setAvailableTimesheets] = useState<TimesheetSelection[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; first_name: string; last_name: string }>>([]);

  // Form state for new invoice
  const [formData, setFormData] = useState<InvoiceFormData>({
    clientId: '',
    issueDate: format(new Date(), 'yyyy-MM-dd'),
    dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    items: [{ description: '', hours: 0, rate: 0, amount: 0 }],
    notes: '',
    taxPercentage: 10, // Default tax percentage
  });

  // Add clients fetch
  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('organization_id', userData?.organization_id)
        .eq('status', 'active');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    }
  };

  // Add employee fetch
  const fetchEmployees = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('organization_id', userData?.organization_id)
        .eq('role', 'employee')
        .eq('client_id', clientId);

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    }
  };

  // Add timesheet fetch
  const fetchTimesheets = async (employeeId: string, startDate: string, endDate: string) => {
    try {
      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('user_id', employeeId)
        .eq('status', 'approved')
        .gte('week_ending', startDate)
        .lte('week_ending', endDate)
        .order('week_ending', { ascending: true });

      if (error) throw error;

      setAvailableTimesheets(
        (data || []).map(ts => ({
          id: ts.id,
          week_ending: ts.week_ending,
          total_hours: ts.total_hours,
          documents: ts.documents || [],
          selected: false
        }))
      );
    } catch (error) {
      console.error('Error fetching timesheets:', error);
      toast.error('Failed to load timesheets');
    }
  };

  useEffect(() => {
    if (userData?.organization_id) {
      fetchInvoices();
      fetchClients(); // Add clients fetch to useEffect
    }
  }, [userData?.organization_id]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          client:clients (
            id,
            name,
            email,
            billing_address
          )
        `)
        .eq('organization_id', userData?.organization_id)
        .order('issue_date', { ascending: false });

      if (error) throw error;

      // Group invoices by client
      const summaries = data.reduce((acc: { [key: string]: ClientInvoiceSummary }, invoice) => {
        const clientId = invoice.client_id;
        if (!acc[clientId]) {
          acc[clientId] = {
            client_id: clientId,
            client_name: invoice.client.name,
            total_invoices: 0,
            total_amount: 0,
            paid_amount: 0,
            pending_amount: 0,
            overdue_amount: 0,
            invoices: []
          };
        }

        acc[clientId].total_invoices++;
        acc[clientId].total_amount += invoice.total;
        
        switch (invoice.status) {
          case 'paid':
            acc[clientId].paid_amount += invoice.total;
            break;
          case 'pending':
            acc[clientId].pending_amount += invoice.total;
            break;
          case 'overdue':
            acc[clientId].overdue_amount += invoice.total;
            break;
        }

        acc[clientId].invoices.push(invoice);
        return acc;
      }, {});

      setClientSummaries(Object.values(summaries));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', hours: 0, rate: 0, amount: 0 }],
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items];
    
    // Handle description separately as it's a string
    if (field === 'description') {
      newItems[index] = {
        ...newItems[index],
        description: value as string
      };
    } else {
      // Handle numeric fields
      const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
      newItems[index] = {
        ...newItems[index],
        [field]: numericValue,
      };

      // Recalculate amount whenever hours or rate changes
      if (field === 'hours' || field === 'rate') {
        const hours = field === 'hours' ? numericValue : newItems[index].hours;
        const rate = field === 'rate' ? numericValue : newItems[index].rate;
        newItems[index].amount = hours * rate;
      }
    }

    setFormData({ ...formData, items: newItems });
  };

  const calculateTotals = (items: typeof formData.items) => {
    const subtotal = items.reduce((sum, item) => {
      const amount = item.hours * item.rate;
      return sum + amount;
    }, 0);
    
    const tax = (subtotal * formData.taxPercentage) / 100;
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProcessing(true);

      // Calculate totals
      const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);
      const tax = (subtotal * (formData.taxPercentage / 100));
      const total = subtotal + tax;

      // Get selected timesheets
      const selectedTimesheets = availableTimesheets.filter(ts => ts.selected);

      // Create invoice
      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
          organization_id: userData?.organization_id,
          client_id: formData.clientId,
          invoice_number: generateInvoiceNumber(), // You need to implement this
          issue_date: formData.issueDate,
          due_date: formData.dueDate,
          items: formData.items,
          subtotal,
          tax,
          total,
          notes: formData.notes,
          status: 'draft',
          timesheet_ids: selectedTimesheets.map(ts => ts.id)
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Invoice created successfully');
      setShowCreateModal(false);
      await fetchInvoices(); // Refresh the invoices list

    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateStatus = async (invoiceId: string, newStatus: Invoice['status']) => {
    try {
      setProcessing(true);
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);

      if (error) throw error;

      setInvoices(invoices.map(inv => 
        inv.id === invoiceId ? { ...inv, status: newStatus } : inv
      ));
    } catch (error) {
      console.error('Error updating invoice status:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleSendInvoice = async (invoice: Invoice) => {
    try {
      setProcessing(true);
      
      // Get selected timesheets
      const selectedTimesheets = availableTimesheets.filter(ts => ts.selected);
      
      // Get signed URLs for all timesheet documents
      const timesheetDocuments = await Promise.all(
        selectedTimesheets.flatMap(ts => 
          ts.documents.map(async doc => {
            const { data } = await supabase.storage
              .from('timesheet-documents')
              .createSignedUrl(doc, 3600);
            return data?.signedUrl;
          })
        )
      );

      // Call the sendInvoice function with timesheet documents
      const { error } = await supabase.functions.invoke('sendInvoice', {
        body: {
          invoice,
          timesheetDocuments: timesheetDocuments.filter(Boolean),
          selectedTimesheets
        }
      });

      if (error) throw error;

      // Update invoice status
      await supabase
        .from('invoices')
        .update({ 
          status: 'pending',
          sent_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      toast.success('Invoice sent successfully');
      await fetchInvoices();
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error('Failed to send invoice');
    } finally {
      setProcessing(false);
    }
  };

  const generatePDF = async (invoice: Invoice) => {
    try {
      setProcessing(true);
      
      // Get organization name
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', userData?.organization_id)
        .single();

      if (orgError) throw orgError;

      const { data, error } = await supabase.functions.invoke('generateInvoicePDF', {
        body: {
          invoice_number: invoice.invoice_number,
          clientName: invoice.client.name,
          clientEmail: invoice.client.email,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          items: invoice.items,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          total: invoice.total,
          notes: invoice.notes,
          organizationName: orgData?.name || 'Our Company'
        }
      });

      if (error) throw error;

      // Create a Blob from the response
      const blob = new Blob([data], { type: 'application/pdf' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoice.invoice_number}.pdf`;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setProcessing(false);
    }
  };

  // Update client selection handler
  const handleClientChange = async (clientId: string) => {
    setFormData({ ...formData, clientId });
    setSelectedEmployeeId('');
    setAvailableTimesheets([]);
    if (clientId) {
      await fetchEmployees(clientId);
    }
  };

  // Add employee selection handler
  const handleEmployeeChange = async (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setAvailableTimesheets([]);
    
    if (employeeId && formData.issueDate && formData.dueDate) {
      await fetchTimesheets(employeeId, formData.issueDate, formData.dueDate);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Invoices</h1>
            <p className="text-white/70 mt-2">Manage your client invoices</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Invoice
          </motion.button>
        </div>

        {showClientInvoices && selectedClient ? (
          // Client Invoices View
          <div className="space-y-6">
            <button
              onClick={() => {
                setShowClientInvoices(false);
                setSelectedClient(null);
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to All Clients
            </button>

            <div className="glass-card p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold">{selectedClient.client_name}</h2>
                  <p className="text-white/70">{selectedClient.total_invoices} Invoices</p>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-sm text-white/70">Total Amount</p>
                    <p className="text-xl font-semibold">${selectedClient.total_amount.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-white/70">Paid</p>
                    <p className="text-xl font-semibold text-green-400">
                      ${selectedClient.paid_amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-white/70">Pending</p>
                    <p className="text-xl font-semibold text-yellow-400">
                      ${selectedClient.pending_amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Invoices Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-white/70 border-b border-glass-light">
                      <th className="text-left py-4">Invoice #</th>
                      <th className="text-left py-4">Issue Date</th>
                      <th className="text-left py-4">Due Date</th>
                      <th className="text-right py-4">Amount</th>
                      <th className="text-left py-4">Status</th>
                      <th className="text-right py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedClient.invoices.map((invoice) => (
                      <motion.tr
                        key={invoice.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-b border-glass-light"
                      >
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary-400" />
                            {invoice.invoice_number}
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-white/50" />
                            {formatDate(invoice.issue_date)}
                          </div>
                        </td>
                        <td className="py-4">
                          {formatDate(invoice.due_date)}
                        </td>
                        <td className="py-4 text-right">
                          ${invoice.total.toLocaleString()}
                        </td>
                        <td className="py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              invoice.status === 'paid'
                                ? 'bg-green-400/10 text-green-400'
                                : invoice.status === 'overdue'
                                ? 'bg-red-400/10 text-red-400'
                                : invoice.status === 'pending'
                                ? 'bg-yellow-400/10 text-yellow-400'
                                : 'bg-blue-400/10 text-blue-400'
                            }`}
                          >
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => generatePDF(invoice)}
                              className="p-2 hover:bg-glass-light rounded-lg transition-colors"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {invoice.status === 'draft' && (
                              <button
                                onClick={() => handleSendInvoice(invoice)}
                                className="p-2 hover:bg-glass-light rounded-lg transition-colors"
                                title="Send Invoice"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowDetailsModal(true);
                              }}
                              className="p-2 hover:bg-glass-light rounded-lg transition-colors"
                              title="View Details"
                            >
                              <MoreVertical className="w-4 h-4" />
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
        ) : (
          // Client Cards View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clientSummaries.map((summary) => (
              <motion.div
                key={summary.client_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-6 cursor-pointer hover:bg-glass-light transition-colors"
                onClick={() => {
                  setSelectedClient(summary);
                  setShowClientInvoices(true);
                }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary-500/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{summary.client_name}</h3>
                    <p className="text-sm text-white/70">{summary.total_invoices} Invoices</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-white/70">Total Amount</p>
                    <p className="font-semibold">${summary.total_amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/70">Paid Amount</p>
                    <p className="font-semibold text-green-400">
                      ${summary.paid_amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-white/70">Pending</p>
                    <p className="font-semibold text-yellow-400">
                      ${summary.pending_amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-white/70">Overdue</p>
                    <p className="font-semibold text-red-400">
                      ${summary.overdue_amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create Invoice Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Invoice"
        >
          <form onSubmit={handleCreateInvoice} className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Client</label>
              <select
                value={formData.clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="input-field"
                required
              >
                <option value="">Select Client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            {formData.clientId && (
              <div>
                <label className="block text-sm text-white/70 mb-2">Employee</label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Issue Date</label>
                <input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => {
                    setFormData({ ...formData, issueDate: e.target.value });
                    if (selectedEmployeeId) {
                      fetchTimesheets(selectedEmployeeId, e.target.value, formData.dueDate);
                    }
                  }}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => {
                    setFormData({ ...formData, dueDate: e.target.value });
                    if (selectedEmployeeId) {
                      fetchTimesheets(selectedEmployeeId, formData.issueDate, e.target.value);
                    }
                  }}
                  className="input-field"
                  required
                />
              </div>
            </div>

            {/* Available Timesheets */}
            {availableTimesheets.length > 0 && (
              <div>
                <label className="block text-sm text-white/70 mb-2">Select Timesheets</label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableTimesheets.map((ts) => (
                    <div
                      key={ts.id}
                      className="flex items-center justify-between p-3 bg-glass-light rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={ts.selected}
                          onChange={(e) => {
                            setAvailableTimesheets(prev =>
                              prev.map(t =>
                                t.id === ts.id ? { ...t, selected: e.target.checked } : t
                              )
                            );
                          }}
                          className="form-checkbox"
                        />
                        <div>
                          <p>Week Ending: {format(new Date(ts.week_ending), 'MMM d, yyyy')}</p>
                          <p className="text-sm text-white/70">{ts.total_hours} hours</p>
                        </div>
                      </div>
                      <div className="text-sm text-white/70">
                        {ts.documents.length} document(s)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-white/70">Items</label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-sm text-primary-400 hover:text-primary-300"
                >
                  Add Item
                </button>
              </div>
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="glass-card p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Item {index + 1}</span>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Description"
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={item.hours || ''}
                          onChange={(e) => handleItemChange(index, 'hours', e.target.value)}
                          placeholder="Hours"
                          className="input-field"
                          min="0"
                          step="0.5"
                          required
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={item.rate || ''}
                          onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                          placeholder="Rate"
                          className="input-field"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end mt-2">
                      <span className="text-sm text-white/70">
                        Amount: ${(item.hours * item.rate).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input-field"
                rows={3}
                placeholder="Additional notes..."
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Tax Percentage (%)</label>
              <input
                type="number"
                value={formData.taxPercentage}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  taxPercentage: Math.max(0, Math.min(100, Number(e.target.value))) 
                })}
                className="input-field"
                min="0"
                max="100"
                step="0.1"
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-glass-light">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-white/70">Subtotal:</span>
                  <span>${calculateTotals(formData.items).subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Tax ({formData.taxPercentage}%):</span>
                  <span>${calculateTotals(formData.items).tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>${calculateTotals(formData.items).total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-glass-light rounded-lg hover:bg-glass-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={processing}
              >
                {processing ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  'Create Invoice'
                )}
              </button>
            </div>
          </form>
        </Modal>

        {/* Invoice Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title={`Invoice ${selectedInvoice?.invoice_number}`}
        >
          {selectedInvoice && (
            <div className="space-y-6">
              <div className="flex justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{selectedInvoice.client.name}</h3>
                  <p className="text-white/70">{selectedInvoice.client.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/70">Issue Date</p>
                  <p>{formatDate(selectedInvoice.issue_date)}</p>
                  <p className="text-sm text-white/70 mt-2">Due Date</p>
                  <p>{formatDate(selectedInvoice.due_date)}</p>
                </div>
              </div>

              <div className="glass-card p-4">
                <h4 className="font-semibold mb-4">Items</h4>
                <div className="space-y-2">
                  {selectedInvoice.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-2 bg-glass-light rounded-lg"
                    >
                      <div>
                        <p>{item.description}</p>
                        <p className="text-sm text-white/70">
                          {item.hours} hours × ${item.rate}/hr
                        </p>
                      </div>
                      <p>${item.amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-glass-light space-y-2">
                  <div className="flex justify-between text-white/70">
                    <span>Subtotal</span>
                    <span>${selectedInvoice.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Tax (10%)</span>
                    <span>${selectedInvoice.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${selectedInvoice.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="glass-card p-4">
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-white/70">{selectedInvoice.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => generatePDF(selectedInvoice)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600/20 text-primary-400 rounded-lg"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                {selectedInvoice.status === 'draft' && (
                  <button
                    onClick={() => handleSendInvoice(selectedInvoice)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600/20 text-primary-400 rounded-lg"
                  >
                    <Send className="w-4 h-4" />
                    Send Invoice
                  </button>
                )}
                {selectedInvoice.status === 'pending' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedInvoice.id, 'paid')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 rounded-lg"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark as Paid
                  </button>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </PageTransition>
  );
};

export default Invoices;