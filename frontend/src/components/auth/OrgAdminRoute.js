import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const OrgAdminRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificăm dacă utilizatorul este org_admin
  if (currentUser.role !== 'org_admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default OrgAdminRoute; 