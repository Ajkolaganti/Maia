import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Register from './pages/auth/Register';
import EmployerDashboard from './pages/employer/Dashboard';
import EmployeeDashboard from './pages/employee/Dashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/shared/PrivateRoute';
import { ThemeProvider } from './context/ThemeContext';

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected employer routes */}
            <Route 
              path="/employer/*" 
              element={
                <PrivateRoute allowedRoles={['employer']}>
                  <EmployerDashboard />
                </PrivateRoute>
              } 
            />

            {/* Protected employee routes */}
            <Route 
              path="/employee/*" 
              element={
                <PrivateRoute allowedRoles={['employee']}>
                  <EmployeeDashboard />
                </PrivateRoute>
              } 
            />

            {/* Root route */}
            <Route 
              path="/" 
              element={<Navigate to="/login" replace />} 
            />

            {/* Catch all route */}
            <Route 
              path="*" 
              element={<Navigate to="/login" replace />} 
            />
          </Routes>
          <Toaster position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;