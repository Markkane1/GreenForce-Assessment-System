import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';
import RoleRoute from './components/common/RoleRoute';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import AdminDashboard from './pages/admin/AdminDashboard';
import GroupManagement from './pages/admin/GroupManagement';
import UserManagement from './pages/admin/UserManagement';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import SignupPage from './pages/auth/SignupPage';
import ChangePasswordPage from './pages/account/ChangePasswordPage';
import ExamPage from './pages/student/ExamPage';
import ResultsPage from './pages/student/ResultsPage';
import StudentDashboard from './pages/student/StudentDashboard';
import GradingPage from './pages/teacher/GradingPage';
import ExamScheduler from './pages/teacher/ExamScheduler';
import MonitorPage from './pages/teacher/MonitorPage';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TestBuilder from './pages/teacher/TestBuilder';
import NotFoundPage from './pages/utility/NotFoundPage';
import UnauthorizedPage from './pages/utility/UnauthorizedPage';
import LoadingSpinner from './components/common/LoadingSpinner';

const HomeRedirect = () => {
  const { user, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user?.role === 'teacher') {
    return <Navigate to="/teacher/dashboard" replace />;
  }

  return <Navigate to="/student/dashboard" replace />;
};

const AppRoutes = () => (
  <div className="min-h-screen bg-background">
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/teacher" element={<Navigate to="/teacher/dashboard" replace />} />
        <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />

        <Route
          path="/admin/dashboard"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <UserManagement />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/groups"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <GroupManagement />
            </RoleRoute>
          }
        />

        <Route
          path="/teacher/dashboard"
          element={
            <RoleRoute allowedRoles={['teacher']}>
              <TeacherDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/teacher/tests/new"
          element={
            <RoleRoute allowedRoles={['teacher']}>
              <TestBuilder />
            </RoleRoute>
          }
        />
        <Route
          path="/teacher/tests/:id"
          element={
            <RoleRoute allowedRoles={['teacher']}>
              <TestBuilder />
            </RoleRoute>
          }
        />
        <Route path="/teacher/tests" element={<Navigate to="/teacher/tests/new" replace />} />
        <Route
          path="/teacher/schedule"
          element={
            <RoleRoute allowedRoles={['teacher']}>
              <ExamScheduler />
            </RoleRoute>
          }
        />
        <Route path="/teacher/schedules" element={<Navigate to="/teacher/schedule" replace />} />
        <Route
          path="/teacher/grade"
          element={
            <RoleRoute allowedRoles={['teacher']}>
              <GradingPage />
            </RoleRoute>
          }
        />
        <Route path="/teacher/grading" element={<Navigate to="/teacher/grade" replace />} />
        <Route
          path="/teacher/monitor/:id"
          element={
            <RoleRoute allowedRoles={['teacher']}>
              <MonitorPage />
            </RoleRoute>
          }
        />

        <Route
          path="/student/dashboard"
          element={
            <RoleRoute allowedRoles={['student']}>
              <StudentDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/student/exam/:id"
          element={
            <RoleRoute allowedRoles={['student']}>
              <ExamPage />
            </RoleRoute>
          }
        />
        <Route
          path="/student/results/:id"
          element={
            <RoleRoute allowedRoles={['student']}>
              <ResultsPage />
            </RoleRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </div>
);

const App = () => (
  <AuthProvider>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRoutes />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
