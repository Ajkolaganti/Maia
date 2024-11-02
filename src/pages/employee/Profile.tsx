import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Passport,
  Calendar,
  FileText,
} from 'lucide-react';
import PageTransition from '../../components/shared/PageTransition';

interface ProfileSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const Profile = () => {
  const [activeSection, setActiveSection] = useState('personal');

  const sections: ProfileSection[] = [
    {
      id: 'personal',
      title: 'Personal Information',
      icon: <User />,
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <img
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces"
              alt="Profile"
              className="w-20 h-20 rounded-lg object-cover"
            />
            <div>
              <h3 className="text-xl font-semibold">John Doe</h3>
              <p className="text-white/70">Senior Developer</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm text-white/70">Full Name</label>
              <input
                type="text"
                defaultValue="John Doe"
                className="w-full px-4 py-2 bg-glass-light rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm text-white/70">Email</label>
              <input
                type="email"
                defaultValue="john.doe@example.com"
                className="w-full px-4 py-2 bg-glass-light rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm text-white/70">Phone</label>
              <input
                type="tel"
                defaultValue="+1 234 567 890"
                className="w-full px-4 py-2 bg-glass-light rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm text-white/70">Location</label>
              <input
                type="text"
                defaultValue="New York, USA"
                className="w-full px-4 py-2 bg-glass-light rounded-lg"
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'documents',
      title: 'Documents & Visas',
      icon: <FileText />,
      content: (
        <div className="space-y-6">
          <div className="glass-card p-4">
            <h4 className="font-semibold mb-4">Passport Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm text-white/70">Passport Number</label>
                <input
                  type="text"
                  defaultValue="P1234567"
                  className="input-field"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm text-white/70">Expiry Date</label>
                <input
                  type="date"
                  defaultValue="2028-12-31"
                  className="input-field"
                />
              </div>
            </div>
          </div>
          
          <div className="glass-card p-4">
            <h4 className="font-semibold mb-4">Visa Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm text-white/70">Visa Type</label>
                <input
                  type="text"
                  defaultValue="H1-B"
                  className="input-field"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm text-white/70">Valid Until</label>
                <input
                  type="date"
                  defaultValue="2026-12-31"
                  className="input-field"
                />
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-white/70 mt-2">Manage your personal information and documents</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="md:w-64 glass-card p-4"
          >
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-primary-600 text-white'
                    : 'text-white/70 hover:bg-glass-light'
                }`}
              >
                {section.icon}
                <span>{section.title}</span>
              </button>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 glass-card p-6"
          >
            {sections.find((s) => s.id === activeSection)?.content}
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Profile;