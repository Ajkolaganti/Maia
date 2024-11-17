import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Download,
  MoreVertical,
  Calendar,
  Building2,
  User,
  Loader,
  Eye,
  ChevronLeft,
} from 'lucide-react';
import PageTransition from '../../components/shared/PageTransition';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import Modal from '../../components/shared/Modal';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface TimesheetEntry {
  id: string;
  user_id: string;
  week_starting: string;
  week_ending: string;
  hours: {
    [date: string]: {
      standard: string;
      comments?: string;
    };
  };
  total_hours: number;
  documents?: string[];
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  users: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    clients?: {
      name: string;
    } | null;
  };
}

interface EmployeeTimesheets {
  employee: TimesheetEntry['users'];
  timesheets: TimesheetEntry[];
  totalHours: number;
  pendingHours: number;
  approvedHours: number;
}

// Add DocumentsModal component
interface DocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: string[];
  employeeName: string;
  weekEnding: string;
}

const DocumentsModal: React.FC<DocumentsModalProps> = ({ 
  isOpen, 
  onClose, 
  documents, 
  employeeName,
  weekEnding 
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Documents - ${employeeName} (Week Ending ${format(new Date(weekEnding), 'MMM d, yyyy')})`}
    >
      <div className="space-y-4">
        {documents.length === 0 ? (
          <p className="text-center text-white/70">No documents attached</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {documents.map((doc, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-glass-light rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary-400" />
                  <span>Document {index + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={doc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </a>
                  <a
                    href={doc}
                    download
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

// Add RejectionModal component
const RejectionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  employeeName: string;
}> = ({ isOpen, onClose, onSubmit, employeeName }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(reason);
      onClose();
    } catch (error) {
      console.error('Error submitting rejection:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reject Timesheet - ${employeeName}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-white/70 mb-2">
            Please provide a reason for rejection
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input-field"
            rows={4}
            placeholder="Enter rejection reason..."
            required
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
            disabled={submitting}
          >
            {submitting ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              'Submit'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const EmployerTimesheets = () => {
  const { userData } = useAuth();
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetEntry | null>(null);
  const [processing, setProcessing] = useState(false);
  const [groupedTimesheets, setGroupedTimesheets] = useState<EmployeeTimesheets[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeTimesheets | null>(null);
  const [showEmployeeTimesheets, setShowEmployeeTimesheets] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  useEffect(() => {
    if (userData?.organization_id) {
      fetchTimesheets();
    }
  }, [userData?.organization_id]);

  const fetchTimesheets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('timesheets')
        .select(`
          *,
          users (
            id,
            first_name,
            last_name,
            email,
            clients (
              name
            )
          )
        `)
        .eq('organization_id', userData?.organization_id)
        .order('week_ending', { ascending: false });

      if (error) throw error;

      // Ensure data is not null and is an array
      if (!data || !Array.isArray(data)) {
        console.log('No timesheet data found');
        setGroupedTimesheets([]);
        return;
      }

      // Group timesheets by employee
      const grouped = data.reduce((acc: { [key: string]: EmployeeTimesheets }, timesheet) => {
        // Skip if user data is missing
        if (!timesheet.users) {
          console.log('Skipping timesheet with missing user data:', timesheet.id);
          return acc;
        }

        const employeeId = timesheet.users.id;
        
        if (!acc[employeeId]) {
          acc[employeeId] = {
            employee: timesheet.users,
            timesheets: [],
            totalHours: 0,
            pendingHours: 0,
            approvedHours: 0
          };
        }

        try {
          // Safely parse hours
          const dailyHours = typeof timesheet.hours === 'string' 
            ? JSON.parse(timesheet.hours) 
            : timesheet.hours || {};
          
          // Calculate total hours
          const totalHours = Object.values(dailyHours).reduce((sum: number, day: any) => {
            try {
              const [h, m] = (day?.standard || '0:0').split(':').map(Number);
              return sum + (h || 0) + ((m || 0) / 60);
            } catch (e) {
              console.warn('Error parsing hours for day:', day);
              return sum;
            }
          }, 0);

          // Add timesheet to employee's records
          acc[employeeId].timesheets.push({
            ...timesheet,
            hours: dailyHours,
            total_hours: Math.round(totalHours * 100) / 100
          });

          // Update employee totals
          acc[employeeId].totalHours += totalHours;
          if (timesheet.status === 'submitted') {
            acc[employeeId].pendingHours += totalHours;
          } else if (timesheet.status === 'approved') {
            acc[employeeId].approvedHours += totalHours;
          }
        } catch (e) {
          console.error('Error processing timesheet:', timesheet.id, e);
        }
        
        return acc;
      }, {});

      // Convert grouped object to array and set state
      const groupedArray = Object.values(grouped).map(employee => ({
        ...employee,
        totalHours: Math.round(employee.totalHours * 100) / 100,
        pendingHours: Math.round(employee.pendingHours * 100) / 100,
        approvedHours: Math.round(employee.approvedHours * 100) / 100
      }));

      setGroupedTimesheets(groupedArray);

    } catch (error) {
      console.error('Error fetching timesheets:', error);
      toast.error('Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  };

  // Add function to send email notification
  const sendTimesheetNotification = async (
    email: string,
    firstName: string,
    status: 'approved' | 'rejected',
    reason?: string
  ) => {
    try {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', userData?.organization_id)
        .single();

      const { error } = await supabase.functions.invoke('sendTimesheetNotification', {
        body: {
          email,
          firstName,
          status,
          reason,
          organizationName: orgData?.name
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  };

  // Update handleTimesheetAction
  const handleTimesheetAction = async (timesheetId: string, action: 'approved' | 'rejected', reason?: string) => {
    try {
      setProcessing(true);
      const { error } = await supabase
        .from('timesheets')
        .update({ 
          status: action,
          ...(reason && { rejection_reason: reason })
        })
        .eq('id', timesheetId);

      if (error) throw error;

      // Get timesheet details for notification
      const timesheet = groupedTimesheets
        .flatMap(group => group.timesheets)
        .find(ts => ts.id === timesheetId);

      if (timesheet) {
        await sendTimesheetNotification(
          timesheet.users.email,
          timesheet.users.first_name,
          action,
          reason
        );
      }

      // Update local state
      setGroupedTimesheets(prev => prev.map(group => ({
        ...group,
        timesheets: group.timesheets.map(ts => {
          if (ts.id === timesheetId) {
            return {
              ...ts,
              status: action,
              ...(reason && { rejection_reason: reason })
            };
          }
          return ts;
        })
      })));

      toast.success(`Timesheet ${action} successfully`);
    } catch (error) {
      console.error(`Error ${action} timesheet:`, error);
      toast.error(`Failed to ${action} timesheet`);
    } finally {
      setProcessing(false);
      setShowRejectionModal(false);
      setSelectedTimesheet(null);
    }
  };

  // Add reject button click handler
  const handleRejectClick = (timesheet: TimesheetEntry) => {
    setSelectedTimesheet(timesheet);
    setShowRejectionModal(true);
  };

  const filteredTimesheets = timesheets.filter(timesheet => {
    const searchMatch = 
      timesheet.users.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      timesheet.users.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      timesheet.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const statusMatch = 
      statusFilter === 'all' || timesheet.status === statusFilter;

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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Timesheets</h1>
            <p className="text-white/70 mt-2">Review and manage employee timesheets</p>
          </div>
        </div>

        {showEmployeeTimesheets && selectedEmployee ? (
          // Individual Employee Timesheets View
          <div className="space-y-6">
            <button
              onClick={() => {
                setShowEmployeeTimesheets(false);
                setSelectedEmployee(null);
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to All Employees
            </button>

            <div className="glass-card p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold">
                    {selectedEmployee.employee.first_name} {selectedEmployee.employee.last_name}
                  </h2>
                  <p className="text-white/70">{selectedEmployee.employee.email}</p>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-sm text-white/70">Total Hours</p>
                    <p className="text-xl font-semibold">{selectedEmployee.totalHours}h</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-white/70">Pending Hours</p>
                    <p className="text-xl font-semibold">{selectedEmployee.pendingHours}h</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-white/70">Approved Hours</p>
                    <p className="text-xl font-semibold">{selectedEmployee.approvedHours}h</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto -mx-6 px-6">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-white/70 border-b border-glass-light">
                        <th className="text-left py-4">Week Ending</th>
                        <th className="text-left py-4">Hours</th>
                        <th className="text-left py-4">Status</th>
                        <th className="text-left py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEmployee.timesheets.map((timesheet) => (
                        <motion.tr
                          key={timesheet.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b border-glass-light"
                        >
                          <td className="py-4">
                            {format(new Date(timesheet.week_ending), 'MMM d, yyyy')}
                          </td>
                          <td className="py-4">
                            {typeof timesheet.total_hours === 'number' 
                              ? `${timesheet.total_hours.toFixed(2)}h` 
                              : '0h'
                            }
                          </td>
                          <td className="py-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                timesheet.status === 'approved'
                                  ? 'bg-green-400/10 text-green-400'
                                  : timesheet.status === 'rejected'
                                  ? 'bg-red-400/10 text-red-400'
                                  : 'bg-yellow-400/10 text-yellow-400'
                              }`}
                            >
                              {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              {timesheet.status === 'submitted' && (
                                <>
                                  <button
                                    onClick={() => handleTimesheetAction(timesheet.id, 'approved')}
                                    className="text-green-400 hover:text-green-300"
                                    title="Approve"
                                  >
                                    <CheckCircle className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleTimesheetAction(timesheet.id, 'rejected')}
                                    className="text-red-400 hover:text-red-300"
                                    title="Reject"
                                  >
                                    <XCircle className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedTimesheet(timesheet);
                                  setShowDetailsModal(true);
                                }}
                                className="text-primary-400 hover:text-primary-300"
                                title="View Details"
                              >
                                <Eye className="w-5 h-5" />
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
          </div>
        ) : (
          // Employee Cards View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedTimesheets.map((employeeData) => (
              <motion.div
                key={employeeData.employee.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-6 cursor-pointer hover:bg-glass-light transition-colors"
                onClick={() => {
                  setSelectedEmployee(employeeData);
                  setShowEmployeeTimesheets(true);
                }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary-500/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {employeeData.employee.first_name} {employeeData.employee.last_name}
                    </h3>
                    <p className="text-sm text-white/70">{employeeData.employee.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-white/70">Total Hours</p>
                    <p className="font-semibold">{employeeData.totalHours}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/70">Pending</p>
                    <p className="font-semibold">{employeeData.pendingHours}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/70">Approved</p>
                    <p className="font-semibold">{employeeData.approvedHours}h</p>
                  </div>
                </div>

                {employeeData.employee.clients?.name && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-white/70">
                    <Building2 className="w-4 h-4" />
                    <span>{employeeData.employee.clients.name}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Timesheet Details"
        >
          {selectedTimesheet && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/70">Employee</label>
                  <p className="text-white">{`${selectedTimesheet.users.first_name} ${selectedTimesheet.users.last_name}`}</p>
                </div>
                <div>
                  <label className="block text-sm text-white/70">Date</label>
                  <p className="text-white">
                    {format(new Date(selectedTimesheet.week_ending), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-white/70">Hours</label>
                  <p className="text-white">{selectedTimesheet.hours}h</p>
                </div>
                <div>
                  <label className="block text-sm text-white/70">Status</label>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      selectedTimesheet.status === 'approved'
                        ? 'bg-green-400/10 text-green-400'
                        : selectedTimesheet.status === 'rejected'
                        ? 'bg-red-400/10 text-red-400'
                        : 'bg-yellow-400/10 text-yellow-400'
                    }`}
                  >
                    {selectedTimesheet.status.charAt(0).toUpperCase() + 
                     selectedTimesheet.status.slice(1)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/70">Description</label>
                <p className="text-white">{selectedTimesheet.description}</p>
              </div>

              {selectedTimesheet.documents && selectedTimesheet.documents.length > 0 && (
                <div>
                  <label className="block text-sm text-white/70 mb-2">Documents</label>
                  <div className="space-y-2">
                    {selectedTimesheet.documents.map((doc, index) => (
                      <a
                        key={index}
                        href={doc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary-400 hover:text-primary-300"
                      >
                        <FileText className="w-4 h-4" />
                        Document {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedTimesheet.status === 'submitted' && (
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={() => handleRejectClick(selectedTimesheet)}
                    className="text-red-400 hover:text-red-300"
                    title="Reject"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleTimesheetAction(selectedTimesheet.id, 'approved')}
                    className="text-green-400 hover:text-green-300"
                    title="Approve"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Add Documents Modal */}
        {selectedTimesheet && (
          <DocumentsModal
            isOpen={showDocumentsModal}
            onClose={() => {
              setShowDocumentsModal(false);
              setSelectedTimesheet(null);
            }}
            documents={selectedTimesheet.documents || []}
            employeeName={`${selectedTimesheet.users.first_name} ${selectedTimesheet.users.last_name}`}
            weekEnding={selectedTimesheet.week_ending}
          />
        )}

        {/* Add RejectionModal */}
        {selectedTimesheet && (
          <RejectionModal
            isOpen={showRejectionModal}
            onClose={() => {
              setShowRejectionModal(false);
              setSelectedTimesheet(null);
            }}
            onSubmit={async (reason) => {
              await handleTimesheetAction(selectedTimesheet.id, 'rejected', reason);
            }}
            employeeName={`${selectedTimesheet.users.first_name} ${selectedTimesheet.users.last_name}`}
          />
        )}
      </div>
    </PageTransition>
  );
};

export default EmployerTimesheets;