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
  invoiceNumber: string;
  clientId: string;
  client: {
    name: string;
    email: string;
    billingAddress: string;
  };
  issueDate: string;
  dueDate: string;
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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [processing, setProcessing] = useState(false);

  // Form state for new invoice
  const [formData, setFormData] = useState<InvoiceFormData>({
    clientId: '',
    issueDate: format(new Date(), 'yyyy-MM-dd'),
    dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    items: [{ description: '', hours: 0, rate: 0, amount: 0 }],
    notes: '',
    taxPercentage: 10, // Default tax percentage
  });

  useEffect(() => {
    if (userData?.organization_id) {  // Only fetch when organizationId is available
      fetchInvoices();
      fetchClients();
    }
  }, [userData?.organization_id]); // Depend on specific property, not the whole object


  const fetchInvoices = async () => {
    if (!userData?.organization_id) return;
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          client_id,
          issue_date,
          due_date,
          status,
          subtotal,
          tax,
          total,
          notes,
          items,
          client:clients (
            id,
            name,
            email,
            billing_address
          )
        `)
        .eq('organization_id', userData.organization_id)
        .order('issue_date', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = data?.map(invoice => ({
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        clientId: invoice.client_id,
        client: {
          name: invoice.client.name,
          email: invoice.client.email,
          billingAddress: invoice.client.billing_address
        },
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        status: invoice.status,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        total: invoice.total,
        items: invoice.items,
        notes: invoice.notes
      }));

      setInvoices(transformedData || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    if (!userData?.organization_id) return;
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, billing_rate')
        .eq('organization_id', userData.organization_id);

      if (error) throw error;
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
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
    if (!userData?.organization_id) return;

    try {
      setProcessing(true);
      const { subtotal, tax, total } = calculateTotals(formData.items);
      
      // Generate invoice number
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      const { data, error } = await supabase
        .from('invoices')
        .insert({
          client_id: formData.clientId,
          issue_date: formData.issueDate,
          due_date: formData.dueDate,
          organization_id: userData.organization_id,
          invoice_number: invoiceNumber,
          status: 'draft',
          subtotal,
          tax,
          total,
          notes: formData.notes,
          items: formData.items.map(item => ({
            description: item.description,
            hours: Number(item.hours),
            rate: Number(item.rate),
            amount: Number(item.amount)
          }))
        })
        .select()
        .single();

      if (error) throw error;

      await fetchInvoices();
      setShowCreateModal(false);
      setFormData({
        clientId: '',
        issueDate: format(new Date(), 'yyyy-MM-dd'),
        dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        items: [{ description: '', hours: 0, rate: 0, amount: 0 }],
        notes: '',
        taxPercentage: 10, // Default tax percentage
      });
    } catch (error) {
      console.error('Error creating invoice:', error);
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
      
      // Get organization name from Supabase
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', userData?.organization_id)
        .single();

      if (orgError) throw orgError;

      // Call the Edge Function to send the invoice
      const { error: emailError } = await supabase.functions.invoke('sendInvoice', {
        body: {
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.client.name,
          clientEmail: invoice.client.email,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          items: invoice.items,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          total: invoice.total,
          notes: invoice.notes,
          organizationName: orgData?.name || 'Our Company',
          billingAddress: invoice.client.billingAddress
        }
      });

      if (emailError) throw emailError;

      // Update invoice status to pending
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ 
          status: 'pending',
          sent_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      if (updateError) throw updateError;

      // Refresh invoices list
      await fetchInvoices();
      
      toast.success('Invoice sent successfully');
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error('Failed to send invoice. Please check your email settings.');
    } finally {
      setProcessing(false);
    }
  };

  const generatePDF = async (invoice: Invoice) => {
    try {
      setProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('generateInvoicePDF', {
        body: {
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.client.name,
          clientEmail: invoice.client.email,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          items: invoice.items,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          total: invoice.total,
          notes: invoice.notes,
          organizationName: userData?.organization?.name || 'Our Company'
        }
      });
  
      if (error) throw error;
  
      // Convert the array buffer to a blob
      const pdfBlob = new Blob([data], { type: 'application/pdf' });
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoice.invoiceNumber}.pdf`;
      
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

  const filteredInvoices = (invoices || []).filter(invoice => {
    if (!invoice) return false;
    
    const searchableText = [
      invoice.client?.name || '',
      invoice.invoice_number || '',
      invoice.status || '',
    ].join(' ').toLowerCase();

    const searchMatch = searchTerm ? searchableText.includes(searchTerm.toLowerCase()) : true;
    const statusMatch = statusFilter === 'all' || invoice.status === statusFilter;

    return searchMatch && statusMatch;
  });

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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Invoices</h1>
            <p className="text-white/70 mt-2">Manage and track your invoices</p>
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

        {/* Filters */}
        <div className="glass-card p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
              <input
                type="text"
                placeholder="Search invoices..."
                className="w-full pl-10 pr-4 py-2 bg-glass-light rounded-lg text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="text-white/50" />
              <select
                className="bg-glass-light rounded-lg px-4 py-2 text-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-white/70 border-b border-glass-light">
                  <th className="text-left py-4">Invoice #</th>
                  <th className="text-left py-4">Client</th>
                  <th className="text-left py-4">Issue Date</th>
                  <th className="text-left py-4">Due Date</th>
                  <th className="text-right py-4">Amount</th>
                  <th className="text-left py-4">Status</th>
                  <th className="text-right py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <motion.tr
                    key={invoice.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-glass-light"
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary-400" />
                        {invoice.invoiceNumber}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-white/50" />
                        {invoice.client.name}
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
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Issue Date</label>
                <input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
            </div>

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