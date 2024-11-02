import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  Users,
  Building2,
  FileText,
  User,
  LogOut,
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

const employerNavItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/employer/dashboard' },
  { label: 'Timesheets', icon: Clock, path: '/employer/timesheets' },
  { label: 'Employees', icon: Users, path: '/employer/employees' },
  { label: 'Clients', icon: Building2, path: '/employer/clients' },
  { label: 'Invoices', icon: FileText, path: '/employer/invoices' },
];

const employeeNavItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/employee/dashboard' },
  { label: 'Timesheets', icon: Clock, path: '/employee/timesheets' },
  { label: 'Profile', icon: User, path: '/employee/profile' },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const isEmployer = location.pathname.startsWith('/employer');
  const navItems = isEmployer ? employerNavItems : employeeNavItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-glass-dark min-h-screen p-4 fixed">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">
              {isEmployer ? 'Employer Portal' : 'Employee Portal'}
            </h1>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-white/70 hover:bg-glass-light'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-4 left-4 right-4">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:bg-glass-light transition-colors">
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-64 p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;