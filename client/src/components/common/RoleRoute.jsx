import { Navigate, Outlet } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';

const RoleRoute = ({ allowedRoles = [], children }) => {
  const { user, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children || <Outlet />;
};

export default RoleRoute;
