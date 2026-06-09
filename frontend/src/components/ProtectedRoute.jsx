import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { authUser, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(authUser.role)) {
    if (authUser.role === 'Admin') {
      return <Navigate to="/dashboard" replace />;
    }

    if (authUser.role === 'Member') {
      return <Navigate to="/member-dashboard" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}