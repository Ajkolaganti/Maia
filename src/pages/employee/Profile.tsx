import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  Briefcase,
  Loader,
  Plus,
  Edit,
  Save,
} from 'lucide-react';
import PageTransition from '../../components/shared/PageTransition';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import Modal from '../../components/shared/Modal';
import toast from 'react-hot-toast';
import DocumentUpload, { EmployeeDocument } from '../../components/shared/DocumentUpload';

interface EmployeeDetails {
  id?: string;
  user_id: string;
  address?: string;
  emergency_contact?: string;
  date_of_birth?: string;
  hire_date?: string;
  department?: string;
  position?: string;
  skills?: string[];
  certifications?: string[];
  education?: string;
  bio?: string;
  visa_type?: string;
  visa_expiry?: string;
  passport_number?: string;
  passport_expiry?: string;
  nationality?: string;
  tax_file_number?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_bsb?: string;
  superannuation_fund?: string;
  superannuation_number?: string;
}

interface DocumentCategories {
  [key: string]: EmployeeDocument[];
}

const Profile = () => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });

  const [detailsFormData, setDetailsFormData] = useState<EmployeeDetails>({
    user_id: userData?.id || '',
    address: '',
    emergency_contact: '',
    date_of_birth: '',
    hire_date: '',
    department: '',
    position: '',
    skills: [],
    certifications: [],
    education: '',
    bio: '',
    visa_type: '',
    visa_expiry: '',
    passport_number: '',
    passport_expiry: '',
    nationality: '',
    tax_file_number: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_bsb: '',
    superannuation_fund: '',
    superannuation_number: '',
  });

  const [documents, setDocuments] = useState<Record<string, EmployeeDocument[]>>({});
  const [loadingDocuments, setLoadingDocuments] = useState(true);

  useEffect(() => {
    if (userData) {
      setFormData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
      });
      fetchEmployeeDetails();
    }
  }, [userData]);

  useEffect(() => {
    if (userData?.id) {
      fetchEmployeeDetails();
      fetchDocuments();
    }
  }, [userData?.id]);

  const fetchEmployeeDetails = async () => {
    if (!userData?.id) return;
    try {
      // Fetch employee details
      const { data, error } = await supabase
        .from('employee_details')
        .select('*')
        .eq('user_id', userData.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      // Update form data with user data
      setFormData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
      });

      // Update details form data
      if (data) {
        setEmployeeDetails(data);
        setDetailsFormData({
          user_id: userData.id,
          address: data.address || '',
          emergency_contact: data.emergency_contact || '',
          date_of_birth: data.date_of_birth || '',
          nationality: data.nationality || '',
          visa_type: data.visa_type || '',
          visa_expiry: data.visa_expiry || '',
          passport_number: data.passport_number || '',
          passport_expiry: data.passport_expiry || '',
          tax_file_number: data.tax_file_number || '',
          bank_account_name: data.bank_account_name || '',
          bank_account_number: data.bank_account_number || '',
          bank_bsb: data.bank_bsb || '',
          superannuation_fund: data.superannuation_fund || '',
          superannuation_number: data.superannuation_number || '',
          skills: data.skills || [],
          certifications: data.certifications || [],
          education: data.education || '',
          bio: data.bio || '',
        });
      } else {
        // Set default empty values if no data exists
        setDetailsFormData({
          user_id: userData.id,
          address: '',
          emergency_contact: '',
          date_of_birth: '',
          nationality: '',
          visa_type: '',
          visa_expiry: '',
          passport_number: '',
          passport_expiry: '',
          tax_file_number: '',
          bank_account_name: '',
          bank_account_number: '',
          bank_bsb: '',
          superannuation_fund: '',
          superannuation_number: '',
          skills: [],
          certifications: [],
          education: '',
          bio: '',
        });
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
      toast.error('Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    if (!userData?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('user_id', userData.id);

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
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.id) return;

    try {
      setProcessing(true);

      // Update user profile in users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
        })
        .eq('id', userData.id);

      if (userError) throw userError;

      // First check if employee details exist
      const { data: existingDetails, error: checkError } = await supabase
        .from('employee_details')
        .select('*')
        .eq('user_id', userData.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      // Clean up dates before sending to database
      const cleanedFormData = {
        ...detailsFormData,
        date_of_birth: detailsFormData.date_of_birth || null,
        visa_expiry: detailsFormData.visa_expiry || null,
        passport_expiry: detailsFormData.passport_expiry || null,
        skills: Array.isArray(detailsFormData.skills) 
          ? detailsFormData.skills 
          : detailsFormData.skills?.split(',').map(s => s.trim()) || [],
        certifications: Array.isArray(detailsFormData.certifications)
          ? detailsFormData.certifications
          : detailsFormData.certifications?.split(',').map(s => s.trim()) || [],
      };

      let detailsError;

      if (existingDetails) {
        // Update existing record
        const { error } = await supabase
          .from('employee_details')
          .update({
            address: cleanedFormData.address,
            emergency_contact: cleanedFormData.emergency_contact,
            date_of_birth: cleanedFormData.date_of_birth,
            nationality: cleanedFormData.nationality,
            visa_type: cleanedFormData.visa_type,
            visa_expiry: cleanedFormData.visa_expiry,
            passport_number: cleanedFormData.passport_number,
            passport_expiry: cleanedFormData.passport_expiry,
            tax_file_number: cleanedFormData.tax_file_number,
            bank_account_name: cleanedFormData.bank_account_name,
            bank_account_number: cleanedFormData.bank_account_number,
            bank_bsb: cleanedFormData.bank_bsb,
            superannuation_fund: cleanedFormData.superannuation_fund,
            superannuation_number: cleanedFormData.superannuation_number,
            skills: cleanedFormData.skills,
            certifications: cleanedFormData.certifications,
            education: cleanedFormData.education,
            bio: cleanedFormData.bio,
          })
          .eq('user_id', userData.id);
        
        detailsError = error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('employee_details')
          .insert({
            user_id: userData.id,
            address: cleanedFormData.address,
            emergency_contact: cleanedFormData.emergency_contact,
            date_of_birth: cleanedFormData.date_of_birth,
            nationality: cleanedFormData.nationality,
            visa_type: cleanedFormData.visa_type,
            visa_expiry: cleanedFormData.visa_expiry,
            passport_number: cleanedFormData.passport_number,
            passport_expiry: cleanedFormData.passport_expiry,
            tax_file_number: cleanedFormData.tax_file_number,
            bank_account_name: cleanedFormData.bank_account_name,
            bank_account_number: cleanedFormData.bank_account_number,
            bank_bsb: cleanedFormData.bank_bsb,
            superannuation_fund: cleanedFormData.superannuation_fund,
            superannuation_number: cleanedFormData.superannuation_number,
            skills: cleanedFormData.skills,
            certifications: cleanedFormData.certifications,
            education: cleanedFormData.education,
            bio: cleanedFormData.bio,
          });
        
        detailsError = error;
      }

      if (detailsError) throw detailsError;

      toast.success('Profile updated successfully');
      setEditing(false);
      
      // Refresh the data
      await fetchEmployeeDetails();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setProcessing(false);
    }
  };

  const handleSkillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const skills = e.target.value.split(',').map(skill => skill.trim());
    setDetailsFormData(prev => ({ ...prev, skills }));
  };

  const handleCertificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const certifications = e.target.value.split(',').map(cert => cert.trim());
    setDetailsFormData(prev => ({ ...prev, certifications }));
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Profile</h1>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </button>
          )}
        </div>

        {/* Main Profile Card */}
        <div className="glass-card p-6">
          <form onSubmit={handleUpdateProfile} className="space-y-8">
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold mb-6">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-white/70 mb-2">First Name</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="input-field"
                    disabled={!editing}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="input-field"
                    disabled={!editing}
                    required
                  />
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
                    disabled={!editing}
                  />
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div>
              <h2 className="text-xl font-semibold mb-6">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    value={detailsFormData.date_of_birth || ''}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, date_of_birth: e.target.value })}
                    className="input-field"
                    disabled={!editing}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Nationality</label>
                  <input
                    type="text"
                    value={detailsFormData.nationality || ''}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, nationality: e.target.value })}
                    className="input-field"
                    disabled={!editing}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/70 mb-2">Address</label>
                  <textarea
                    value={detailsFormData.address || ''}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, address: e.target.value })}
                    className="input-field"
                    rows={2}
                    disabled={!editing}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/70 mb-2">Emergency Contact</label>
                  <input
                    type="text"
                    value={detailsFormData.emergency_contact || ''}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, emergency_contact: e.target.value })}
                    className="input-field"
                    disabled={!editing}
                  />
                </div>
              </div>
            </div>

            {/* Visa & Passport Information */}
            <div>
              <h2 className="text-xl font-semibold mb-6">Visa & Passport Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Visa Type</label>
                  <input
                    type="text"
                    value={detailsFormData.visa_type || ''}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, visa_type: e.target.value })}
                    className="input-field"
                    disabled={!editing}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Visa Expiry Date</label>
                  <input
                    type="date"
                    value={detailsFormData.visa_expiry || ''}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, visa_expiry: e.target.value })}
                    className="input-field"
                    disabled={!editing}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Passport Number</label>
                  <input
                    type="text"
                    value={detailsFormData.passport_number || ''}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, passport_number: e.target.value })}
                    className="input-field"
                    disabled={!editing}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Passport Expiry Date</label>
                  <input
                    type="date"
                    value={detailsFormData.passport_expiry || ''}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, passport_expiry: e.target.value })}
                    className="input-field"
                    disabled={!editing}
                  />
                </div>
              </div>
            </div>

            {/* Banking & Tax Information */}
            <div>
              <h2 className="text-xl font-semibold mb-6">Banking & Tax Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Tax File Number</label>
                  <input
                    type="text"
                    value={detailsFormData.tax_file_number || ''}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, tax_file_number: e.target.value })}
                    className="input-field"
                    disabled={!editing}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Bank Account Name</label>
                  <input
                    type="text"
                    value={detailsFormData.bank_account_name || ''}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, bank_account_name: e.target.value })}
                    className="input-field"
                    disabled={!editing}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Bank Account Number</label>
                  <input
                    type="text"
                    value={detailsFormData.bank_account_number || ''}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, bank_account_number: e.target.value })}
                    className="input-field"
                    disabled={!editing}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">BSB</label>
                  <input
                    type="text"
                    value={detailsFormData.bank_bsb || ''}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, bank_bsb: e.target.value })}
                    className="input-field"
                    disabled={!editing}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Superannuation Fund</label>
                  <input
                    type="text"
                    value={detailsFormData.superannuation_fund || ''}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, superannuation_fund: e.target.value })}
                    className="input-field"
                    disabled={!editing}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Superannuation Number</label>
                  <input
                    type="text"
                    value={detailsFormData.superannuation_number || ''}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, superannuation_number: e.target.value })}
                    className="input-field"
                    disabled={!editing}
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div>
              <h2 className="text-xl font-semibold mb-6">Professional Information</h2>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Skills</label>
                  <input
                    type="text"
                    value={detailsFormData.skills?.join(', ') || ''}
                    onChange={handleSkillChange}
                    className="input-field"
                    placeholder="React, TypeScript, Node.js"
                    disabled={!editing}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Certifications</label>
                  <input
                    type="text"
                    value={detailsFormData.certifications?.join(', ') || ''}
                    onChange={handleCertificationChange}
                    className="input-field"
                    placeholder="AWS, Azure, Google Cloud"
                    disabled={!editing}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Education</label>
                  <textarea
                    value={detailsFormData.education || ''}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, education: e.target.value })}
                    className="input-field"
                    rows={2}
                    placeholder="Your educational background"
                    disabled={!editing}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Bio</label>
                  <textarea
                    value={detailsFormData.bio || ''}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, bio: e.target.value })}
                    className="input-field"
                    rows={3}
                    placeholder="A brief description about yourself"
                    disabled={!editing}
                  />
                </div>
              </div>
            </div>

            {editing && (
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-2"
                  disabled={processing}
                >
                  {processing ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Documents Section */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-6">My Documents</h2>
          {loadingDocuments ? (
            <div className="flex justify-center">
              <Loader className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries({
                visa: 'Visa Documents',
                offer_letter: 'Offer Letter',
                contract: 'Employment Contract',
                certifications: 'Certifications',
                other: 'Other Documents'
              }).map(([category, label]) => (
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
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-glass-medium rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
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
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Profile;