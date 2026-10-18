import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { homePath, useAuth } from '../context/AuthContext';
import { PageSpinner } from './ui';

export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <Navigate to={homePath(user)} replace />;
  return <Outlet />;
}
