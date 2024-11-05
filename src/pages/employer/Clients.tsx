import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  Building2,
  Mail,
  Phone,
  MapPin,
  Users,
  FileText,
  Loader,
  MoreVertical,
  Edit,
  Trash2,
  DollarSign,
} from 'lucide-react';
import PageTransition from '../../components/shared/PageTransition';
import { useAuth } from '../../context/AuthContext';
import { api, Client } from '../../services/api';
import Modal from '../../components/shared/Modal';
import { supabase } from '../../config/supabase';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  industry: string;
  website?: string;
  billing_address?: string;
  billing_rate?: number;
  status: 'active' | 'inactive';
  organization_id: string;
}

interface ClientWithDetails extends Client {
  employeeCount: number;
  projectCount: number;
  totalRevenue: number;
  activeProjects: {
    id: string;
    name: string;
    status: string;
  }[];
  assignedEmployees: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  }[];
}

const Clients = () => {
  const { userData } = useAuth();
  const [clients, setClients] = useState<ClientWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithDetails | null>(null);
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    industry: '',
    website: '',
    billingAddress: '',
    billingRate: '',
  });

  useEffect(() => {
    if (userData?.organization_id) {  // Only fetch when organizationId is available
      fetchClients();
    }
  }, [userData?.organization_id]); // Depend on specific property, not the whole object

  const fetchClients = async () => {
    if (!userData?.organization_id) return;
    try {
      // Fetch basic client information
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', userData.organization_id);

      if (clientsError) throw clientsError;

      // Fetch additional details for each client
      const enrichedClients = await Promise.all(
        clientsData.map(async (client) => {
          // Get employee count
          const { count: employeeCount } = await supabase
            .from('employees')
            .select('*', { count: 'exact' })
            .eq('clientId', client.id);

          // Get projects
          const { data: projects } = await supabase
            .from('projects')
            .select('*')
            .eq('clientId', client.id);

          // Get assigned employees
          const { data: employees } = await supabase
            .from('employees')
            .select('id, firstName, lastName, role')
            .eq('clientId', client.id);

          // Calculate total revenue from invoices
          const { data: invoices } = await supabase
            .from('invoices')
            .select('amount')
            .eq('clientId', client.id)
            .eq('status', 'paid');

          const totalRevenue = invoices?.reduce((sum, inv) => sum + inv.amount, 0) || 0;

          return {
            ...client,
            employeeCount: employeeCount || 0,
            projectCount: projects?.length || 0,
            totalRevenue,
            activeProjects: projects?.filter(p => p.status === 'active') || [],
            assignedEmployees: employees || [],
          };
        })
      );

      setClients(enrichedClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.organization_id) return;

    try {
      setProcessing(true);
      const { data, error } = await supabase
        .from('clients')
        .insert({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
          industry: formData.industry,
          website: formData.website,
          billing_address: formData.billingAddress,
          billing_rate: formData.billingRate ? Number(formData.billingRate) : null,
          organization_id: userData.organization_id,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      await fetchClients();
      setShowAddModal(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        location: '',
        industry: '',
        website: '',
        billingAddress: '',
        billingRate: '',
      });
    } catch (error) {
      console.error('Error adding client:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    try {
      setProcessing(true);
      const { error } = await supabase
        .from('clients')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
          industry: formData.industry,
          website: formData.website,
          billing_address: formData.billingAddress,
          billing_rate: formData.billingRate ? Number(formData.billingRate) : null,
        })
        .eq('id', selectedClient.id);

      if (error) throw error;

      await fetchClients();
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating client:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) return;

    try {
      setProcessing(true);
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;
      setClients(clients.filter(c => c.id !== clientId));
    } catch (error) {
      console.error('Error deleting client:', error);
    } finally {
      setProcessing(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <h1 className="text-3xl font-bold">Clients</h1>
            <p className="text-white/70 mt-2">Manage your client relationships</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Client
          </motion.button>
        </div>

        <div className="glass-card p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="Search clients..."
              className="w-full pl-10 pr-4 py-2 bg-glass-light rounded-lg text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-6"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary-600/20 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-primary-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{client.name}</h3>
                      <p className="text-white/70">{client.industry}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => {
                        setSelectedClient(client);
                        setShowDetailsModal(true);
                      }}
                      className="p-2 hover:bg-glass-light rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-white/70">
                    <Users className="w-4 h-4" />
                    <span>{client.employeeCount} Employees</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    <FileText className="w-4 h-4" />
                    <span>{client.projectCount} Projects</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-glass-light space-y-2">
                  <div className="flex items-center gap-2 text-white/70">
                    <MapPin className="w-4 h-4" />
                    <span>{client.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    <DollarSign className="w-4 h-4" />
                    <span>${client.totalRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Add/Edit Client Modal */}
        <Modal
          isOpen={showAddModal || showEditModal}
          onClose={() => (showAddModal ? setShowAddModal(false) : setShowEditModal(false))}
          title={showAddModal ? "Add New Client" : "Edit Client"}
        >
          <form onSubmit={showAddModal ? handleAddClient : handleUpdateClient} className="space-y-4">
            {/* Form fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Client Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">Industry</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
            </div>

            {/* Additional form fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Billing Address</label>
              <textarea
                value={formData.billingAddress}
                onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                className="input-field"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Billing Rate ($/hour)</label>
              <input
                type="number"
                value={formData.billingRate}
                onChange={(e) => setFormData({ ...formData, billingRate: e.target.value })}
                className="input-field"
                required
                min="0"
                step="0.01"
              />
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={() => showAddModal ? setShowAddModal(false) : setShowEditModal(false)}
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
                ) : showAddModal ? (
                  'Add Client'
                ) : (
                  'Update Client'
                )}
              </button>
            </div>
          </form>
        </Modal>

        {/* Client Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Client Details"
        >
          {selectedClient && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-primary-600/20 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-primary-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedClient.name}</h3>
                  <p className="text-white/70">{selectedClient.industry}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="glass-card p-4">
                  <h4 className="font-semibold mb-2">Contact Information</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-white/70">
                      <Mail className="w-4 h-4" />
                      <span>{selectedClient.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/70">
                      <Phone className="w-4 h-4" />
                      <span>{selectedClient.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/70">
                      <MapPin className="w-4 h-4" />
                      <span>{selectedClient.location}</span>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-4">
                  <h4 className="font-semibold mb-2">Business Details</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-white/70">
                      <Users className="w-4 h-4" />
                      <span>{selectedClient.employeeCount} Assigned Employees</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/70">
                      <FileText className="w-4 h-4" />
                      <span>{selectedClient.projectCount} Total Projects</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/70">
                      <DollarSign className="w-4 h-4" />
                      <span>${selectedClient.totalRevenue.toLocaleString()} Revenue</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4">
                <h4 className="font-semibold mb-4">Active Projects</h4>
                <div className="space-y-2">
                  {selectedClient.activeProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-2 bg-glass-light rounded-lg"
                    >
                      <span>{project.name}</span>
                      <span className="px-2 py-1 text-xs bg-green-400/10 text-green-400 rounded-full">
                        {project.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-4">
                <h4 className="font-semibold mb-4">Assigned Employees</h4>
                <div className="space-y-2">
                  {selectedClient.assignedEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-2 bg-glass-light rounded-lg"
                    >
                      <div>
                        <p>{`${employee.firstName} ${employee.lastName}`}</p>
                        <p className="text-sm text-white/70">{employee.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setFormData({
                      name: selectedClient.name,
                      email: selectedClient.email,
                      phone: selectedClient.phone,
                      location: selectedClient.location,
                      industry: selectedClient.industry,
                      website: selectedClient.website || '',
                      billingAddress: selectedClient.billing_address || '',
                      billingRate: selectedClient.billing_rate?.toString() || '',
                    });
                    setShowDetailsModal(false);
                    setShowEditModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600/20 text-primary-400 rounded-lg"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteClient(selectedClient.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </PageTransition>
  );
};

export default Clients;