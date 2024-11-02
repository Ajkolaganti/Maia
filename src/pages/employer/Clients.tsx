import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  Building2,
  Mail,
  Phone,
  MapPin,
  Users,
  FileText,
} from 'lucide-react';
import PageTransition from '../../components/shared/PageTransition';

interface Client {
  id: string;
  name: string;
  logo: string;
  email: string;
  phone: string;
  location: string;
  employees: number;
  projects: number;
  status: 'active' | 'inactive';
}

const mockClients: Client[] = [
  {
    id: '1',
    name: 'Tech Corp',
    logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop',
    email: 'contact@techcorp.com',
    phone: '+1 234 567 890',
    location: 'San Francisco, USA',
    employees: 5,
    projects: 3,
    status: 'active',
  },
  {
    id: '2',
    name: 'Design Studio',
    logo: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=100&h=100&fit=crop',
    email: 'hello@designstudio.com',
    phone: '+1 234 567 891',
    location: 'New York, USA',
    employees: 3,
    projects: 2,
    status: 'active',
  },
];

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = mockClients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Clients</h1>
            <p className="text-white/70 mt-2">Manage your client relationships</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Client
          </motion.button>
        </div>

        <div className="glass-card p-6 space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="Search clients..."
              className="w-full pl-10 pr-4 py-2 bg-glass-light rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredClients.map((client) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-6"
              >
                <div className="flex gap-4">
                  <img
                    src={client.logo}
                    alt={client.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-semibold">{client.name}</h3>
                        <p className="text-white/70">{client.location}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          client.status === 'active'
                            ? 'bg-green-400/10 text-green-400'
                            : 'bg-red-400/10 text-red-400'
                        }`}
                      >
                        {client.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-white/70">
                        <Users className="w-4 h-4" />
                        <span>{client.employees} Employees</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70">
                        <FileText className="w-4 h-4" />
                        <span>{client.projects} Projects</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-glass-light grid grid-cols-1 gap-2">
                      <div className="flex items-center gap-2 text-white/70">
                        <Mail className="w-4 h-4" />
                        <span>{client.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70">
                        <Phone className="w-4 h-4" />
                        <span>{client.phone}</span>
                      </div>
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

export default Clients;