import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  Building2,
  User,
  Briefcase,
  Loader,
  MoreVertical,
  Edit,
  Trash2,
  UserPlus,
  FileText,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  Upload,
  Eye,
} from 'lucide-react';
import PageTransition from '../../components/shared/PageTransition';
import { useAuth } from '../../context/AuthContext';
import { api, Employee } from '../../services/api';
import Modal from '../../components/shared/Modal';
import { supabase } from '../../config/supabase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import DocumentUpload from '../../components/shared/DocumentUpload';

interface EmployeeWithClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  organization_id: string;
  client_id?: string;
  client?: {
    id: string;
    name: string;
  } | null;
  status: 'active' | 'inactive';
  visa_type?: string;
  visa_expiry?: string;
  passport_number?: string;
  passport_expiry?: string;
  nationality?: string;
}

interface EmployeeStats {
  totalHours: number;
  totalRevenue: number;
  completedProjects: number;
  averageHoursPerWeek: number;
  clientSatisfaction: number;
}

interface EmployeeTimesheet {
  id: string;
  date: string;
  hours: number;
  description: string;
  status: string;
}

interface EmployeeInvoice {
  id: string;
  invoice_number: string;
  date: string;
  amount: number;
  status: string;
}

interface EmployeeProject {
  id: string;
  name: string;
  client: string;
  status: string;
  startDate: string;
  endDate?: string;
}

interface EmployeeDocument {
  id?: string;
  user_id: string;
  category: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
  expiry_date?: string | null;
  status?: 'valid' | 'expired' | 'expiring_soon';
}

const EditEmployeeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeWithClient;
}> = ({ isOpen, onClose, employee }) => {
  const [formData, setFormData] = useState({
    firstName: employee.first_name,
    lastName: employee.last_name,
    email: employee.email,
    phone: employee.phone || '',
    clientId: employee.client_id || '',
    status: employee.status,
    visa_type: employee.visa_type || '',
    visa_expiry: employee.visa_expiry || '',
    passport_number: employee.passport_number || '',
    passport_expiry: employee.passport_expiry || '',
    nationality: employee.nationality || '',
  });
  const [processing, setProcessing] = useState(false);
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('organization_id', employee.organization_id);

      if (error) throw error;
      setAvailableClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProcessing(true);

      // Update basic info in users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          client_id: formData.clientId || null,
          status: formData.status,
        })
        .eq('id', employee.id);

      if (userError) throw userError;

      // Update or insert visa info in employee_details table
      const { error: detailsError } = await supabase
        .from('employee_details')
        .upsert({
          user_id: employee.id,
          visa_type: formData.visa_type,
          visa_expiry: formData.visa_expiry,
          passport_number: formData.passport_number,
          passport_expiry: formData.passport_expiry,
          nationality: formData.nationality,
        }, {
          onConflict: 'user_id',
        });

      if (detailsError) throw detailsError;

      toast.success('Employee updated successfully');
      onClose();
      // Refresh employee list
      window.location.reload();
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('Failed to update employee');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Employee"
    >
      <div className="space-y-6">
        <div className="flex gap-4">
          <button
            onClick={() => setShowDocumentUpload(false)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              !showDocumentUpload 
                ? 'bg-ximble-600 text-white' 
                : 'bg-glass-light hover:bg-glass-medium'
            }`}
          >
            Profile Details
          </button>
          <button
            onClick={() => setShowDocumentUpload(true)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              showDocumentUpload 
                ? 'bg-ximble-600 text-white' 
                : 'bg-glass-light hover:bg-glass-medium'
            }`}
          >
            Documents
          </button>
        </div>

        {showDocumentUpload ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Employee Documents</h3>
              <DocumentUpload
                userId={employee.id}
                category="visa"
                canDelete={true}
                onUploadComplete={() => {
                  // Optionally refresh documents list
                  toast.success('Document uploaded successfully');
                }}
              />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Existing form fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                className="input-field"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Assigned Client</label>
              <select
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="input-field"
              >
                <option value="">No Client</option>
                {availableClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="input-field"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Visa Type</label>
              <input
                type="text"
                value={formData.visa_type}
                onChange={(e) => setFormData({ ...formData, visa_type: e.target.value })}
                className="input-field"
                placeholder="e.g., Student, Work, PR"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Visa Expiry Date</label>
              <input
                type="date"
                value={formData.visa_expiry}
                onChange={(e) => setFormData({ ...formData, visa_expiry: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Passport Number</label>
              <input
                type="text"
                value={formData.passport_number}
                onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Passport Expiry Date</label>
              <input
                type="date"
                value={formData.passport_expiry}
                onChange={(e) => setFormData({ ...formData, passport_expiry: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Nationality</label>
              <input
                type="text"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                className="input-field"
                placeholder="e.g., Australian"
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
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
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

const Employees = () => {
  const { userData } = useAuth();
  const [employees, setEmployees] = useState<EmployeeWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithClient | null>(null);
  const [availableClients, setAvailableClients] = useState<{ id: string; name: string; }[]>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    clientId: '',
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [recentTimesheets, setRecentTimesheets] = useState<EmployeeTimesheet[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<EmployeeInvoice[]>([]);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [processingEmails, setProcessingEmails] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);

  useEffect(() => {
    if (userData?.organization_id) {  // Only fetch when organizationId is available
      fetchEmployees();
      fetchClients();
    }
  }, [userData?.organization_id]); // Depend on specific property, not the whole object

  const fetchEmployees = async () => {
    if (!userData?.organization_id) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          client:clients (
            id,
            name
          )
        `)
        .eq('organization_id', userData.organization_id)
        .eq('role', 'employee');

      if (error) throw error;
      setEmployees(data as EmployeeWithClient[]);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    if (!userData?.organization_id) return;
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('organization_id', userData.organization_id);

      if (error) throw error;
      setAvailableClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const generateTemporaryPassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.organization_id) return;

    try {
      setProcessing(true);
      setError(null);

      // Generate temporary password
      const temporaryPassword = generateTemporaryPassword();

      // Get organization name
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', userData.organization_id)
        .single();

      console.log('Creating employee...', {
        email: formData.email,
        organizationName: orgData?.name
      });

      // Create employee through Edge Function
      const { data: newEmployee, error: createError } = await supabase.functions.invoke('createEmployee', {
        body: {
          email: formData.email,
          password: temporaryPassword,
          userData: {
            email: formData.email,
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            role: 'employee',
            organization_id: userData.organization_id,
            client_id: formData.clientId || null,
          },
          organizationName: orgData?.name || 'Our Company'
        }
      });

      if (createError) {
        console.error('Error from Edge Function:', createError);
        throw createError;
      }

      console.log('Employee created successfully:', newEmployee);

      // Reset form and refresh employee list
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: '',
        clientId: '',
      });
      setShowAddModal(false);
      await fetchEmployees();

      toast.success('Employee added successfully and welcome email sent');
    } catch (error) {
      console.error('Error adding employee:', error);
      setError('An error occurred while adding the employee. Please try again.');
      toast.error('Failed to add employee. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateEmployee = async (employeeId: string, updates: any) => {
    try {
      setProcessing(true);

      // First, update the user record
      const { error: userError } = await supabase
        .from('users')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          email: updates.email,
          phone: updates.phone,
          client_id: updates.clientId || null,
          role: updates.role
        })
        .eq('id', employeeId);

      if (userError) throw userError;

      // Format dates properly, ensuring they're valid or null
      const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return null;
        try {
          // Validate date format
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return null;
          return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        } catch {
          return null;
        }
      };

      // Prepare employee details with proper date handling
      const employeeDetails = {
        department: updates.department || null,
        position: updates.position || null,
        hire_date: formatDate(updates.hireDate),
        salary: updates.salary || null,
        employment_type: updates.employmentType || null,
        status: updates.status || 'active'
      };

      // Then, update employee details if they exist, or create if they don't
      const { data: existingDetails } = await supabase
        .from('employee_details')
        .select('*')
        .eq('user_id', employeeId)
        .single();

      if (existingDetails) {
        // Update existing details
        const { error: detailsError } = await supabase
          .from('employee_details')
          .update(employeeDetails)
          .eq('user_id', employeeId);

        if (detailsError) throw detailsError;
      } else {
        // Create new details
        const { error: detailsError } = await supabase
          .from('employee_details')
          .insert({
            user_id: employeeId,
            ...employeeDetails
          });

        if (detailsError) throw detailsError;
      }

      // Refresh employee list
      await fetchEmployees();
      
      toast.success('Employee updated successfully');
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('Failed to update employee');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      setProcessing(true);
      await supabase.from('employees').delete().eq('id', employeeId);
      setEmployees(employees.filter(emp => emp.id !== employeeId));
    } catch (error) {
      console.error('Error deleting employee:', error);
    } finally {
      setProcessing(false);
    }
  };

  const filteredEmployees = employees.filter(employee => 
    employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchEmployeeDetails = async (employeeId: string) => {
    try {
      // Fetch recent timesheets
      const { data: timesheets } = await supabase
        .from('timesheets')
        .select('*')
        .eq('user_id', employeeId)
        .order('date', { ascending: false })
        .limit(5);

      // Fetch recent invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          date,
          total as amount,
          status
        `)
        .eq('client_id', selectedEmployee?.client_id)
        .order('date', { ascending: false })
        .limit(5);

      setRecentTimesheets(timesheets || []);
      setRecentInvoices(invoices || []);

    } catch (error) {
      console.error('Error fetching employee details:', error);
    }
  };

  const handleViewEmployee = async (employee: EmployeeWithClient) => {
    try {
      setLoadingDetails(true);
      setSelectedEmployee(employee);
      await fetchEmployeeDetails(employee.id);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error loading employee details:', error);
      toast.error('Failed to load employee details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleResendWelcomeEmails = async (selectedEmployees?: string[]) => {
    try {
      setProcessingEmails(true);
      
      const { error } = await supabase.functions.invoke('resendWelcomeEmails', {
        body: {
          organizationId: userData?.organization_id,
          employeeIds: selectedEmployees // Optional: send to specific employees only
        }
      });

      if (error) throw error;
      
      toast.success('Welcome emails sent successfully');
    } catch (error) {
      console.error('Error sending welcome emails:', error);
      toast.error('Failed to send welcome emails');
    } finally {
      setProcessingEmails(false);
    }
  };

  const handleResendWelcomeEmail = async (employeeId: string) => {
    try {
      setProcessing(true);
      const { error } = await supabase.functions.invoke('resendWelcomeEmails', {
        body: {
          organizationId: userData?.organization_id,
          employeeIds: [employeeId]
        }
      });

      if (error) throw error;
      toast.success('Welcome email sent successfully');
    } catch (error) {
      console.error('Error sending welcome email:', error);
      toast.error('Failed to send welcome email');
    } finally {
      setProcessing(false);
    }
  };

  const EmployeeDocumentsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    employee: EmployeeWithClient;
  }> = ({ isOpen, onClose, employee }) => {
    const [documents, setDocuments] = useState<Record<string, EmployeeDocument[]>>({});
    const [uploading, setUploading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('visa');
    const [expiryDate, setExpiryDate] = useState('');

    const documentCategories = {
      visa: 'Visa Documents',
      offer_letter: 'Offer Letter',
      contract: 'Employment Contract',
      certifications: 'Certifications',
      other: 'Other Documents'
    };

    useEffect(() => {
      if (employee.id) {
        fetchDocuments();
      }
    }, [employee.id]);

    const fetchDocuments = async () => {
      try {
        const { data, error } = await supabase
          .from('employee_documents')
          .select('*')
          .eq('user_id', employee.id);

        if (error) throw error;

        // Group documents by category
        const grouped = (data || []).reduce((acc: Record<string, EmployeeDocument[]>, doc) => {
          if (!acc[doc.category]) {
            acc[doc.category] = [];
          }
          acc[doc.category].push(doc);
          return acc;
        }, {});

        setDocuments(grouped);
      } catch (error) {
        console.error('Error fetching documents:', error);
        toast.error('Failed to load documents');
      }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !e.target.files.length) return;

      try {
        setUploading(true);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${employee.id}/${selectedCategory}/${fileName}`;

        // Upload file to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('employee-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('employee-documents')
          .getPublicUrl(filePath);

        // Save document reference in the database
        const { error: dbError } = await supabase
          .from('employee_documents')
          .insert({
            user_id: employee.id,
            category: selectedCategory,
            file_name: file.name,
            file_url: publicUrl,
            expiry_date: expiryDate || null,
            status: expiryDate ? 'valid' : null
          });

        if (dbError) throw dbError;

        await fetchDocuments();
        toast.success('Document uploaded successfully');
        setExpiryDate('');

      } catch (error) {
        console.error('Error uploading document:', error);
        toast.error('Failed to upload document');
      } finally {
        setUploading(false);
        if (e.target) e.target.value = '';
      }
    };

    const handleDeleteDocument = async (documentId: string, fileUrl: string) => {
      try {
        // Delete from database
        const { error: dbError } = await supabase
          .from('employee_documents')
          .delete()
          .eq('id', documentId);

        if (dbError) throw dbError;

        // Delete from storage
        const filePath = fileUrl.split('/').pop();
        if (filePath) {
          const { error: storageError } = await supabase.storage
            .from('employee-documents')
            .remove([filePath]);

          if (storageError) throw storageError;
        }

        await fetchDocuments();
        toast.success('Document deleted successfully');

      } catch (error) {
        console.error('Error deleting document:', error);
        toast.error('Failed to delete document');
      }
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Documents - ${employee.first_name} ${employee.last_name}`}
      >
        <div className="space-y-6">
          {/* Upload Section */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input-field flex-1"
              >
                {Object.entries(documentCategories).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {selectedCategory === 'visa' && (
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="input-field w-40"
                  placeholder="Expiry Date"
                />
              )}
            </div>
            
            <div className="relative">
              <input
                type="file"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
              />
              <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-white/20 rounded-lg hover:border-white/40 transition-colors">
                {uploading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Choose file or drag & drop</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Documents List */}
          <div className="space-y-6">
            {Object.entries(documentCategories).map(([category, label]) => (
              <div key={category}>
                <h3 className="text-lg font-medium border-b border-white/10 pb-2 mb-4">
                  {label}
                </h3>
                <div className="space-y-2">
                  {documents[category]?.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-glass-light rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-primary-400" />
                        <div>
                          <p className="text-sm font-medium">{doc.file_name}</p>
                          {doc.expiry_date && (
                            <p className={`text-xs ${
                              doc.status === 'expired' 
                                ? 'text-red-400' 
                                : doc.status === 'expiring_soon' 
                                ? 'text-yellow-400' 
                                : 'text-white/70'
                            }`}>
                              Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-glass-medium rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => doc.id && handleDeleteDocument(doc.id, doc.file_url)}
                          className="p-1 hover:bg-glass-medium rounded transition-colors text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!documents[category] || documents[category].length === 0) && (
                    <p className="text-sm text-white/50 text-center py-2">
                      No documents uploaded
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    );
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
            <h1 className="text-3xl font-bold">Employees</h1>
            <p className="text-white/70 mt-2">Manage your team members</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => handleResendWelcomeEmails()}
              className="btn-secondary flex items-center gap-2"
              disabled={processingEmails}
            >
              {processingEmails ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Resend Welcome Emails
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Employee
            </button>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="Search employees..."
              className="w-full pl-10 pr-4 py-2 bg-glass-light rounded-lg text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((employee) => (
              <motion.div
                key={employee.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-6 cursor-pointer hover:bg-glass-light transition-colors"
                onClick={async () => {
                  handleViewEmployee(employee);
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary-600/20 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">
                        {employee.first_name} {employee.last_name}
                      </h3>
                      <p className="text-white/70">{employee.role}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setShowDetailsModal(true);
                      }}
                      className="p-2 hover:bg-glass-light rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-white/70">
                    <Mail className="w-4 h-4" />
                    <span>{employee.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    <Phone className="w-4 h-4" />
                    <span>{employee.phone}</span>
                  </div>
                  {employee.client && (
                    <div className="flex items-center gap-2 text-white/70">
                      <Building2 className="w-4 h-4" />
                      <span>{employee.client.name}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Add Employee Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Employee"
        >
          <form onSubmit={handleAddEmployee} className="space-y-4">
            {/* Form fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
            </div>

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

            <div>
              <label className="block text-sm text-white/70 mb-2">Role</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Assigned Client</label>
              <select
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="input-field"
              >
                <option value="">No Client</option>
                {availableClients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
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
                  'Add Employee'
                )}
              </button>
            </div>
          </form>
        </Modal>

        {/* Edit Employee Modal */}
        {selectedEmployee && (
          <EditEmployeeModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedEmployee(null);
            }}
            employee={selectedEmployee}
          />
        )}

        {/* Employee Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Employee Profile"
        >
          {loadingDetails ? (
            <div className="flex justify-center items-center h-64">
              <Loader className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : selectedEmployee && (
            <div className="space-y-6">
              {/* Header Section */}
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-lg bg-primary-600/20 flex items-center justify-center">
                  <User className="w-12 h-12 text-primary-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </h2>
                  <p className="text-white/70">{selectedEmployee.role}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      selectedEmployee.status === 'active'
                        ? 'bg-green-400/10 text-green-400'
                        : 'bg-red-400/10 text-red-400'
                    }`}>
                      {selectedEmployee.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 text-white/70 mb-2">
                    <Clock className="w-4 h-4" />
                    <span>Total Hours</span>
                  </div>
                  <p className="text-2xl font-semibold">164</p>
                </div>
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 text-white/70 mb-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Revenue</span>
                  </div>
                  <p className="text-2xl font-semibold">$12,450</p>
                </div>
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 text-white/70 mb-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Projects</span>
                  </div>
                  <p className="text-2xl font-semibold">8</p>
                </div>
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 text-white/70 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Avg Hours/Week</span>
                  </div>
                  <p className="text-2xl font-semibold">41</p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Email</label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-white/50" />
                      <span>{selectedEmployee.email}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Phone</label>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-white/50" />
                      <span>{selectedEmployee.phone}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Assignment */}
              {selectedEmployee.client && (
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold mb-4">Current Assignment</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary-600/20 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-primary-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{selectedEmployee.client.name}</h4>
                      <p className="text-white/70">Active Project</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Timesheets */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Timesheets</h3>
                <div className="space-y-3">
                  {recentTimesheets.length > 0 ? (
                    recentTimesheets.map((timesheet) => (
                      <div
                        key={timesheet.id}
                        className="flex items-center justify-between p-3 bg-glass-light rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-white/50" />
                          <div>
                            <p>{format(new Date(timesheet.date), 'MMM d, yyyy')}</p>
                            <p className="text-sm text-white/70">{timesheet.hours} hours</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          timesheet.status === 'approved'
                            ? 'bg-green-400/10 text-green-400'
                            : timesheet.status === 'rejected'
                            ? 'bg-red-400/10 text-red-400'
                            : 'bg-yellow-400/10 text-yellow-400'
                        }`}>
                          {timesheet.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/70 text-center py-4">No recent timesheets</p>
                  )}
                </div>
              </div>

              {/* Recent Invoices */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Invoices</h3>
                <div className="space-y-3">
                  {recentInvoices.length > 0 ? (
                    recentInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-3 bg-glass-light rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-white/50" />
                          <div>
                            <p>{invoice.invoice_number}</p>
                            <p className="text-sm text-white/70">
                              {format(new Date(invoice.date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${invoice.amount.toLocaleString()}</p>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            invoice.status === 'paid'
                              ? 'bg-green-400/10 text-green-400'
                              : 'bg-yellow-400/10 text-yellow-400'
                          }`}>
                            {invoice.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/70 text-center py-4">No recent invoices</p>
                  )}
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-white/70">Client Satisfaction</span>
                      <span>4.8/5.0</span>
                    </div>
                    <div className="h-2 bg-glass-light rounded-full overflow-hidden">
                      <div className="h-full bg-primary-600" style={{ width: '96%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-white/70">Project Completion Rate</span>
                      <span>92%</span>
                    </div>
                    <div className="h-2 bg-glass-light rounded-full overflow-hidden">
                      <div className="h-full bg-primary-600" style={{ width: '92%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-white/70">Timesheet Accuracy</span>
                      <span>98%</span>
                    </div>
                    <div className="h-2 bg-glass-light rounded-full overflow-hidden">
                      <div className="h-full bg-primary-600" style={{ width: '98%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => handleResendWelcomeEmail(selectedEmployee.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600/20 text-primary-400 rounded-lg"
                  disabled={processing}
                >
                  {processing ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Resend Welcome Email
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setFormData({
                      firstName: selectedEmployee.first_name,
                      lastName: selectedEmployee.last_name,
                      email: selectedEmployee.email,
                      phone: selectedEmployee.phone,
                      role: selectedEmployee.role,
                      clientId: selectedEmployee.client_id || '',
                    });
                    setShowEditModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600/20 text-primary-400 rounded-lg"
                >
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </button>
                <button
                  onClick={() => handleDeleteEmployee(selectedEmployee.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Employee
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Documents Modal */}
        {selectedEmployee && (
          <EmployeeDocumentsModal
            isOpen={showDocumentsModal}
            onClose={() => setShowDocumentsModal(false)}
            employee={selectedEmployee}
          />
        )}
      </div>
    </PageTransition>
  );
};

export default Employees;