import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../../components/shared/DashboardLayout';
import EmployerHome from './Home';
import Employees from './Employees';
import Timesheets from './Timesheets';
import Invoices from './Invoices';
import Clients from './Clients';

const EmployerDashboard = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<EmployerHome />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/timesheets" element={<Timesheets />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default EmployerDashboard;