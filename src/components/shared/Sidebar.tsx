import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Clock,
  Users,
  Building2,
  FileText,
  LogOut,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../shared/Logo';

interface SidebarProps {
  routes: {
    path: string;
    label: string;
    icon: React.ReactNode;
  }[];
}

const employerRoutes = [
  { path: '/employer/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
  { path: '/employer/timesheets', label: 'Timesheets', icon: <Clock /> },
  { path: '/employer/employees', label: 'Employees', icon: <Users /> },
  { path: '/employer/clients', label: 'Clients', icon: <Building2 /> },
  { path: '/employer/invoices', label: 'Invoices', icon: <FileText /> },
];

const employeeRoutes = [
  { path: '/employee/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
  { path: '/employee/timesheets', label: 'Timesheets', icon: <Clock /> },
  { path: '/employee/profile', label: 'Profile', icon: <User /> },
];

const Sidebar = () => {
  const { userType } = useAuth();
  const routes = userType === 'employer' ? employerRoutes : employeeRoutes;

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="h-screen w-64 glass-card p-4 flex flex-col fixed left-0 top-0"
    >
      <div className="flex items-center justify-center mb-8">
        <Logo size="md" />
      </div>

      <nav className="flex-1 space-y-2">
        {routes.map((route) => (
          <NavLink
            key={route.path}
            to={route.path}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : 'text-white/70'}`
            }
          >
            {route.icon}
            <span>{route.label}</span>
          </NavLink>
        ))}
      </nav>

      <NavLink
        to="/login"
        className="nav-link text-white/70 mt-auto border-t border-glass-light pt-4"
      >
        <LogOut className="w-5 h-5" />
        <span>Logout</span>
      </NavLink>
    </motion.div>
  );
};

export default Sidebar;