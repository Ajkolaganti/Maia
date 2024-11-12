import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, FileText, Loader, Calendar } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import DocumentUpload from '../shared/DocumentUpload';

interface TimesheetFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  initialData?: any;
  processing: boolean;
}

const TimesheetForm: React.FC<TimesheetFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  processing
}) => {
  const [formData, setFormData] = useState({
    weekEnding: initialData?.weekEnding || format(new Date(), 'yyyy-MM-dd'),
    dailyHours: initialData?.dailyHours || {},
    description: initialData?.description || '',
    documents: [] as File[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const newErrors: Record<string, string> = {};
    
    if (!formData.weekEnding) {
      newErrors.weekEnding = 'Week ending date is required';
    }

    const totalHours = Object.values(formData.dailyHours).reduce((sum, hours) => sum + hours, 0);
    if (totalHours === 0) {
      newErrors.hours = 'At least one day must have hours logged';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit(formData);
  };

  const handleDailyHoursChange = (date: string, hours: number) => {
    setFormData(prev => ({
      ...prev,
      dailyHours: {
        ...prev.dailyHours,
        [date]: Math.max(0, Math.min(24, hours)) // Limit hours between 0 and 24
      }
    }));
  };

  // Generate weekdays
  const weekStart = startOfWeek(new Date(formData.weekEnding), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }).map((_, index) => {
    const date = addDays(weekStart, index);
    return {
      date,
      dateString: format(date, 'yyyy-MM-dd'),
      dayName: format(date, 'EEEE')
    };
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm text-white/70 mb-2">Week Ending</label>
        <input
          type="date"
          value={formData.weekEnding}
          onChange={(e) => setFormData({ ...formData, weekEnding: e.target.value })}
          className="input-field"
          required
        />
        {errors.weekEnding && (
          <p className="text-red-400 text-sm mt-1">{errors.weekEnding}</p>
        )}
      </div>

      <div>
        <h3 className="text-sm text-white/70 mb-4">Daily Hours</h3>
        <div className="space-y-4">
          {weekDays.map(({ dateString, dayName }) => (
            <div key={dateString} className="flex items-center gap-4">
              <span className="w-24">{dayName}</span>
              <input
                type="number"
                value={formData.dailyHours[dateString] || ''}
                onChange={(e) => handleDailyHoursChange(dateString, parseFloat(e.target.value) || 0)}
                className="input-field w-24"
                min="0"
                max="24"
                step="0.5"
              />
              <span className="text-sm text-white/70">hours</span>
            </div>
          ))}
        </div>
        {errors.hours && (
          <p className="text-red-400 text-sm mt-1">{errors.hours}</p>
        )}
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-2">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="input-field"
          rows={3}
          placeholder="Describe your work for this week..."
          required
        />
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-2">Supporting Documents</label>
        <DocumentUpload
          userId={formData.weekEnding}
          category="timesheet"
          onUploadComplete={(docs) => {
            // Handle uploaded documents
          }}
        />
      </div>

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
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
            'Submit Timesheet'
          )}
        </button>
      </div>
    </form>
  );
};

export default TimesheetForm; 