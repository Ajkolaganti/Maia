import React, { useState, useEffect } from 'react';
import { Upload, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import toast from 'react-hot-toast';

const OrganizationSettings = () => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [orgInfo, setOrgInfo] = useState<{
    name: string;
    logo_url?: string;
  } | null>(null);

  useEffect(() => {
    if (userData?.organization_id) {
      fetchOrganizationInfo();
    }
  }, [userData?.organization_id]);

  const fetchOrganizationInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('name, logo_url')
        .eq('id', userData?.organization_id)
        .single();

      if (error) throw error;
      setOrgInfo(data);
    } catch (error) {
      console.error('Error fetching organization info:', error);
      toast.error('Failed to load organization information');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length) return;

    try {
      setUploading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${userData?.organization_id}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('organization-logos')
        .getPublicUrl(filePath);

      // Update organization record
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: publicUrl })
        .eq('id', userData?.organization_id);

      if (updateError) throw updateError;

      await fetchOrganizationInfo();
      toast.success('Logo updated successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold mb-4">Organization Logo</h2>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-lg bg-glass-light flex items-center justify-center">
            {orgInfo?.logo_url ? (
              <img 
                src={orgInfo.logo_url} 
                alt={orgInfo.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <Upload className="w-8 h-8 text-white/50" />
            )}
          </div>
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              id="logo-upload"
              disabled={uploading}
            />
            <label
              htmlFor="logo-upload"
              className="btn-primary flex items-center gap-2 cursor-pointer"
            >
              {uploading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Logo
                </>
              )}
            </label>
            <p className="text-sm text-white/50 mt-2">
              Recommended size: 512x512px
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSettings; 