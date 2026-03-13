import { Navigate, Outlet, useLocation } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';

const ProtectedRoute = ({ children }) => {
  const { user, isAuthReady } = useAuth();
  const location = useLocation();

  if (!isAuthReady) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children || <Outlet />;
};

export default ProtectedRoute;
