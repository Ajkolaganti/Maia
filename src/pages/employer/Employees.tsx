import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Mail, Phone, MapPin, Building2 } from 'lucide-react';
import PageTransition from '../../components/shared/PageTransition';

interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  department: string;
  avatar: string;
  status: 'active' | 'inactive';
}

const mockEmployees: Employee[] = [
  {
    id: '1',
    name: 'John Doe',
    role: 'Senior Developer',
    email: 'john.doe@example.com',
    phone: '+1 234 567 890',
    location: 'New York, USA',
    department: 'Engineering',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces',
    status: 'active',
  },
  {
    id: '2',
    name: 'Jane Smith',
    role: 'Product Designer',
    email: 'jane.smith@example.com',
    phone: '+1 234 567 891',
    location: 'San Francisco, USA',
    department: 'Design',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces',
    status: 'active',
  },
];

const Employees = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmployees = mockEmployees.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Employees</h1>
            <p className="text-white/70 mt-2">Manage your team members</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Employee
          </motion.button>
        </div>

        <div className="glass-card p-6 space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="Search employees..."
              className="w-full pl-10 pr-4 py-2 bg-glass-light rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEmployees.map((employee) => (
              <motion.div
                key={employee.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-glass-light rounded-xl p-4 flex gap-4"
              >
                <img
                  src={employee.avatar}
                  alt={employee.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{employee.name}</h3>
                      <p className="text-white/70 text-sm">{employee.role}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        employee.status === 'active'
                          ? 'bg-green-400/10 text-green-400'
                          : 'bg-red-400/10 text-red-400'
                      }`}
                    >
                      {employee.status}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-white/70">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {employee.email}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {employee.phone}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {employee.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {employee.department}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Employees;