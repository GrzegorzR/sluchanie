import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ user, children }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!user.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

export default AdminRoute; 