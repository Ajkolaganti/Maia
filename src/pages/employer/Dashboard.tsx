import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../../components/shared/DashboardLayout';
import EmployerHome from './Home';
import Timesheets from './Timesheets';
import Employees from './Employees';
import Clients from './Clients';
import Invoices from './Invoices';

const EmployerDashboard = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="dashboard" element={<EmployerHome />} />
        <Route path="timesheets" element={<Timesheets />} />
        <Route path="employees" element={<Employees />} />
        <Route path="clients" element={<Clients />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default EmployerDashboard;