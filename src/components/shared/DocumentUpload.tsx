import React, { useState } from 'react';
import { Upload, X, FileText, Loader, Eye, Download, Trash2 } from 'lucide-react';
import { supabase } from '../../config/supabase';
import toast from 'react-hot-toast';

interface DocumentUploadProps {
  userId: string;
  category: string;
  existingDocuments?: EmployeeDocument[];
  onUploadComplete: (newDocuments: EmployeeDocument[]) => void;
  canDelete?: boolean;
}

export interface EmployeeDocument {
  id?: string;
  user_id: string;
  category: string;
  subcategory?: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
  expiry_date?: string | null;
  status?: 'valid' | 'expired' | 'expiring_soon';
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  userId,
  category,
  existingDocuments = [],
  onUploadComplete,
  canDelete = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>(category);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');

  const documentCategories = {
    visa: {
      name: 'Visa Documents',
      subcategories: [
        'H1B Visa',
        'EAD Card',
        'I-94',
        'Visa Stamp',
        'I-797',
        'Other Visa Documents'
      ]
    },
    passport: {
      name: 'Passport',
      subcategories: [
        'Current Passport',
        'Previous Passport',
        'Other Passport Documents'
      ]
    },
    employment: {
      name: 'Employment Documents',
      subcategories: [
        'Offer Letter',
        'Employment Contract',
        'NDA',
        'Other Employment Documents'
      ]
    },
    certifications: {
      name: 'Certifications',
      subcategories: [
        'Professional Certifications',
        'Educational Certificates',
        'Other Certificates'
      ]
    },
    other: {
      name: 'Other Documents',
      subcategories: ['Other']
    }
  };

  // Set initial subcategory
  React.useEffect(() => {
    if (documentCategories[selectedCategory]) {
      setSelectedSubcategory(documentCategories[selectedCategory].subcategories[0]);
    }
  }, [selectedCategory]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length) return;

    try {
      setUploading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const safeFileName = `${Math.random().toString(36).slice(2)}.${fileExt}`;
      const storagePath = `${userId}/${selectedCategory}/${safeFileName}`;

      console.log('Uploading file to path:', storagePath);

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(storagePath);

      // Save document reference in the database
      const { data: documentData, error: dbError } = await supabase
        .from('employee_documents')
        .insert({
          user_id: userId,
          category: selectedCategory,
          subcategory: selectedSubcategory,
          file_name: file.name,
          file_url: publicUrl,
          storage_path: storagePath,
          expiry_date: expiryDate || null,
          status: expiryDate ? 'valid' : null
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Update the parent component
      onUploadComplete([...existingDocuments, documentData]);
      toast.success('Document uploaded successfully');
      setExpiryDate('');

    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
      // Reset file input
      if (e.target) e.target.value = '';
    }
  };

  const handleDelete = async (documentId: string, storagePath: string) => {
    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('employee_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('employee-documents')
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Update the parent component
      onUploadComplete(existingDocuments.filter(doc => doc.id !== documentId));
      toast.success('Document deleted successfully');

    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex gap-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-field flex-1"
          >
            {Object.entries(documentCategories).map(([value, category]) => (
              <option key={value} value={value}>{category.name}</option>
            ))}
          </select>
          <select
            value={selectedSubcategory}
            onChange={(e) => setSelectedSubcategory(e.target.value)}
            className="input-field flex-1"
          >
            {documentCategories[selectedCategory]?.subcategories.map((subcat) => (
              <option key={subcat} value={subcat}>{subcat}</option>
            ))}
          </select>
          {(selectedCategory === 'visa' || selectedCategory === 'passport') && (
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="input-field w-40"
              placeholder="Expiry Date"
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex-1">
            <label className="relative flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-white/20 rounded-lg hover:border-white/40 transition-colors cursor-pointer">
              <input
                type="file"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
              />
              {uploading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>Choose file or drag & drop</span>
            </label>
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="space-y-6">
        {Object.entries(documentCategories).map(([category, { name, subcategories }]) => {
          const categoryDocs = existingDocuments.filter(doc => doc.category === category);
          if (categoryDocs.length === 0) return null;

          return (
            <div key={category}>
              <h3 className="text-lg font-medium border-b border-white/10 pb-2 mb-4">
                {name}
              </h3>
              {subcategories.map((subcategory) => {
                const subcategoryDocs = categoryDocs.filter(doc => doc.subcategory === subcategory);
                if (subcategoryDocs.length === 0) return null;

                return (
                  <div key={subcategory} className="mb-4">
                    <h4 className="text-sm font-medium text-white/70 mb-2">{subcategory}</h4>
                    <div className="space-y-2">
                      {subcategoryDocs.map((doc) => (
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
                              onClick={() => window.open(doc.file_url, '_blank')}
                              className="p-1 hover:bg-glass-medium rounded transition-colors"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => doc.id && handleDelete(doc.id, doc.storage_path)}
                                className="p-1 hover:bg-glass-medium rounded transition-colors text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DocumentUpload; 