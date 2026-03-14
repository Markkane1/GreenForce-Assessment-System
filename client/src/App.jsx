import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';
import RoleRoute from './components/common/RoleRoute';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import LoadingSpinner from './components/common/LoadingSpinner';

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const GroupManagement = lazy(() => import('./pages/admin/GroupManagement'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));
const ChangePasswordPage = lazy(() => import('./pages/account/ChangePasswordPage'));
const ExamPage = lazy(() => import('./pages/student/ExamPage'));
const ResultsPage = lazy(() => import('./pages/student/ResultsPage'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const GradingPage = lazy(() => import('./pages/teacher/GradingPage'));
const ExamScheduler = lazy(() => import('./pages/teacher/ExamScheduler'));
const MonitorPage = lazy(() => import('./pages/teacher/MonitorPage'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const TestsPage = lazy(() => import('./pages/teacher/TestsPage'));
const TestBuilder = lazy(() => import('./pages/teacher/TestBuilder'));
const NotFoundPage = lazy(() => import('./pages/utility/NotFoundPage'));
const UnauthorizedPage = lazy(() => import('./pages/utility/UnauthorizedPage'));

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <LoadingSpinner />
  </div>
);

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
    <Suspense fallback={<RouteFallback />}>
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
              <RoleRoute allowedRoles={['teacher', 'admin']}>
                <TeacherDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/teacher/tests"
            element={
              <RoleRoute allowedRoles={['teacher', 'admin']}>
                <TestsPage />
              </RoleRoute>
            }
          />
          <Route
            path="/teacher/tests/new"
            element={
              <RoleRoute allowedRoles={['teacher', 'admin']}>
                <TestBuilder />
              </RoleRoute>
            }
          />
          <Route
            path="/teacher/tests/:id"
            element={
              <RoleRoute allowedRoles={['teacher', 'admin']}>
                <TestBuilder />
              </RoleRoute>
            }
          />
          <Route
            path="/teacher/schedule"
            element={
              <RoleRoute allowedRoles={['teacher', 'admin']}>
                <ExamScheduler />
              </RoleRoute>
            }
          />
          <Route path="/teacher/schedules" element={<Navigate to="/teacher/schedule" replace />} />
          <Route
            path="/teacher/grade"
            element={
              <RoleRoute allowedRoles={['teacher', 'admin']}>
                <GradingPage />
              </RoleRoute>
            }
          />
          <Route path="/teacher/grading" element={<Navigate to="/teacher/grade" replace />} />
          <Route
            path="/teacher/monitor/:id"
            element={
              <RoleRoute allowedRoles={['teacher', 'admin']}>
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
    </Suspense>
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
