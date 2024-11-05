import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Users,
  FileText,
  Clock,
  LogOut,
  Menu,
  X,
  Building2,
  User,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

const employerNavItems: NavItem[] = [
  { name: 'Dashboard', path: '/employer', icon: Home },
  { name: 'Employees', path: '/employer/employees', icon: Users },
  { name: 'Timesheets', path: '/employer/timesheets', icon: Clock },
  { name: 'Invoices', path: '/employer/invoices', icon: FileText },
  { name: 'Clients', path: '/employer/clients', icon: Building2 },
];

const employeeNavItems: NavItem[] = [
  { name: 'Dashboard', path: '/employee', icon: Home },
  { name: 'Timesheets', path: '/employee/timesheets', icon: Clock },
  { name: 'Profile', path: '/employee/profile', icon: User },
];

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, userData } = useAuth();

  const navItems = userData?.role === 'employer' ? employerNavItems : employeeNavItems;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 transform transition-transform duration-300 ease-in-out z-40
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:relative lg:translate-x-0 bg-glass-light/10 backdrop-blur-xl border-r border-white/10`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6">
            <h1 className="text-2xl font-bold">EMS</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-primary-500 text-white' 
                      : 'hover:bg-glass-light'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-glass-light mt-auto">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                <User className="w-5 h-5 text-primary-300" />
              </div>
              <div>
                <p className="font-medium">{userData?.first_name} {userData?.last_name}</p>
                <p className="text-sm text-white/70">{userData?.role}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full mt-4 flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-glass-light transition-colors text-left"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile menu button */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-glass-light hover:bg-glass-medium transition-colors"
          >
            {sidebarOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Content area */}
        <main className="flex-1 p-6 pt-20 lg:pt-6 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;