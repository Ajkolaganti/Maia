import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles = [] }) => {
  const { userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // If user is not logged in, redirect to login
  if (!userData) {
    return <Navigate to="/login" replace />;
  }

  // If roles are specified and user's role is not included, redirect to appropriate dashboard
  if (allowedRoles.length > 0 && !allowedRoles.includes(userData.role)) {
    // Redirect employer to employer dashboard
    if (userData.role === 'employer') {
      return <Navigate to="/employer" replace />;
    }
    // Redirect employee to employee dashboard
    if (userData.role === 'employee') {
      return <Navigate to="/employee" replace />;
    }
    // Fallback to login if role is unknown
    return <Navigate to="/login" replace />;
  }

  // If all checks pass, render the protected component
  return <>{children}</>;
};

export default PrivateRoute; 