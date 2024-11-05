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
  });

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

  const fetchEmployeeDetails = async () => {
    if (!userData?.id) return;
    try {
      const { data, error } = await supabase
        .from('employee_details')
        .select('*')
        .eq('user_id', userData.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setEmployeeDetails(data);
        setDetailsFormData(data);
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
      toast.error('Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.id) return;

    try {
      setProcessing(true);
      const { error } = await supabase
        .from('users')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
        })
        .eq('id', userData.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.id) return;

    try {
      setProcessing(true);
      const { error } = await supabase
        .from('employee_details')
        .upsert({
          ...detailsFormData,
          user_id: userData.id,
        });

      if (error) throw error;

      await fetchEmployeeDetails();
      toast.success('Details updated successfully');
    } catch (error) {
      console.error('Error updating details:', error);
      toast.error('Failed to update details');
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Basic Information */}
          <div className="glass-card p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-6">Basic Information</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
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

          {/* Additional Details */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-6">Additional Details</h2>
            <form onSubmit={handleUpdateDetails} className="space-y-6">
              <div>
                <label className="block text-sm text-white/70 mb-2">Address</label>
                <textarea
                  value={detailsFormData.address || ''}
                  onChange={(e) => setDetailsFormData({ ...detailsFormData, address: e.target.value })}
                  className="input-field"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">Emergency Contact</label>
                <input
                  type="text"
                  value={detailsFormData.emergency_contact || ''}
                  onChange={(e) => setDetailsFormData({ ...detailsFormData, emergency_contact: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">Date of Birth</label>
                <input
                  type="date"
                  value={detailsFormData.date_of_birth || ''}
                  onChange={(e) => setDetailsFormData({ ...detailsFormData, date_of_birth: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={detailsFormData.skills?.join(', ') || ''}
                  onChange={handleSkillChange}
                  className="input-field"
                  placeholder="React, TypeScript, Node.js"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">Certifications (comma-separated)</label>
                <input
                  type="text"
                  value={detailsFormData.certifications?.join(', ') || ''}
                  onChange={handleCertificationChange}
                  className="input-field"
                  placeholder="AWS, Azure, Google Cloud"
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
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-2"
                disabled={processing}
              >
                {processing ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Details
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Profile;