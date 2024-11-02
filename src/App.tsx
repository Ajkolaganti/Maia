import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import EmployerDashboard from './pages/employer/Dashboard';
import EmployeeDashboard from './pages/employee/Dashboard';
import Login from './pages/Login';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/employer/*" element={<EmployerDashboard />} />
        <Route path="/employee/*" element={<EmployeeDashboard />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;