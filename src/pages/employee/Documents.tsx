import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Upload,
  Download,
  Eye,
  Loader,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import PageTransition from '../../components/shared/PageTransition';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import DocumentUpload from '../../components/shared/DocumentUpload';
import toast from 'react-hot-toast';

interface EmployeeDocument {
  id?: string;
  user_id: string;
  category: string;
  subcategory?: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
  expiry_date?: string | null;
  status?: 'valid' | 'expired' | 'expiring_soon';
  uploaded_by?: 'employer' | 'employee';
}

const Documents = () => {
  const { userData } = useAuth();
  const [documents, setDocuments] = useState<Record<string, EmployeeDocument[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const documentCategories = {
    all: 'All Documents',
    visa: 'Visa Documents',
    passport: 'Passport Documents',
    employment: 'Employment Documents',
    certifications: 'Certifications',
    other: 'Other Documents'
  };

  useEffect(() => {
    if (userData?.id) {
      fetchDocuments();
    }
  }, [userData?.id]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('user_id', userData?.id)
        .order('uploaded_at', { ascending: false });

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
      setLoading(false);
    }
  };

  const handleDocumentUpload = (newDocuments: EmployeeDocument[]) => {
    fetchDocuments(); // Refresh the documents list
    toast.success('Document uploaded successfully');
  };

  const getFilteredDocuments = () => {
    if (selectedCategory === 'all') {
      return Object.values(documents).flat();
    }
    return documents[selectedCategory] || [];
  };

  const checkDocumentStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;

    const expiry = new Date(expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (expiry < now) {
      return 'expired';
    } else if (expiry <= thirtyDaysFromNow) {
      return 'expiring_soon';
    }
    return 'valid';
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">My Documents</h1>
            <p className="text-white/70 mt-2">View and manage your documents</p>
          </div>
        </div>

        {/* Document Upload Section */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4">Upload New Document</h2>
          <DocumentUpload
            userId={userData?.id || ''}
            category={selectedCategory === 'all' ? 'other' : selectedCategory}
            existingDocuments={getFilteredDocuments()}
            onUploadComplete={handleDocumentUpload}
            canDelete={true}
          />
        </div>

        {/* Document Categories */}
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Object.entries(documentCategories).map(([category, label]) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-primary-600 text-white'
                  : 'bg-glass-light hover:bg-glass-medium'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Documents List */}
        <div className="glass-card p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : getFilteredDocuments().length === 0 ? (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <FileText className="w-12 h-12 text-white/20" />
              </div>
              <h3 className="text-lg font-medium">No documents found</h3>
              <p className="text-white/70 mt-2">
                Upload new documents using the form above
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {getFilteredDocuments().map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-4 bg-glass-light rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary-500/10 rounded">
                      <FileText className="w-6 h-6 text-primary-400" />
                    </div>
                    <div>
                      <h4 className="font-medium">{doc.file_name}</h4>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-white/70">
                          {doc.category.charAt(0).toUpperCase() + doc.category.slice(1)}
                          {doc.subcategory && ` - ${doc.subcategory}`}
                        </span>
                        {doc.expiry_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span className={`text-sm ${
                              checkDocumentStatus(doc.expiry_date) === 'expired'
                                ? 'text-red-400'
                                : checkDocumentStatus(doc.expiry_date) === 'expiring_soon'
                                ? 'text-yellow-400'
                                : 'text-green-400'
                            }`}>
                              Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {doc.uploaded_by && (
                          <span className="text-sm text-white/50">
                            Uploaded by {doc.uploaded_by}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-glass-medium rounded transition-colors"
                      title="View"
                    >
                      <Eye className="w-5 h-5" />
                    </a>
                    <a
                      href={doc.file_url}
                      download
                      className="p-2 hover:bg-glass-medium rounded transition-colors"
                      title="Download"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Documents; 