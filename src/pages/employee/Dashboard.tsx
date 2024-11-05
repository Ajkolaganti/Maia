import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../../components/shared/DashboardLayout';
import EmployeeHome from './Home';
import Timesheets from './Timesheets';
import Profile from './Profile';
import Documents from './Documents';

const EmployeeDashboard = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<EmployeeHome />} />
        <Route path="/timesheets" element={<Timesheets />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default EmployeeDashboard;