import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

import Login from './pages/Login';
import AdminLayout from './components/layout/AdminLayout';
import StaffLayout from './components/layout/StaffLayout';
import AdminDashboard from './pages/admin/Dashboard';
import StaffDashboard from './pages/staff/Dashboard';

const Loading = () => <div className="flex h-screen items-center justify-center">Loading...</div>;

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole?: 'admin' | 'staff' }) => {
  const { session, profile, isLoading } = useAuthStore();

  if (isLoading) return <Loading />;
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // If session exists but profile isn't loaded yet, show loading
  // to prevent an infinite redirect loop.
  if (!profile) {
    return <Loading />;
  }

  if (allowedRole && profile.role !== allowedRole) {
    // Redirect to correct dashboard based on role
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/staff'} replace />;
  }

  return <>{children}</>;
};

function App() {
  const { initialize, session, profile, isLoading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) return <Loading />;

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={
            session ? (
              <Navigate to={profile?.role === 'admin' ? '/admin' : '/staff'} replace />
            ) : (
              <Login />
            )
          } 
        />
        
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          } 
        >
          <Route index element={<AdminDashboard />} />
          {/* Add other admin routes here like teams, analytics */}
        </Route>

        <Route 
          path="/staff" 
          element={
            <ProtectedRoute allowedRole="staff">
              <StaffLayout />
            </ProtectedRoute>
          } 
        >
          <Route index element={<StaffDashboard />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
