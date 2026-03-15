import { Eye, EyeOff, Feather, LockKeyhole } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as authService from '../../services/authService';

const getRedirectPath = (role) => {
  if (role === 'admin') {
    return '/admin/dashboard';
  }

  if (role === 'teacher') {
    return '/teacher/dashboard';
  }

  return '/student/dashboard';
};

const EditorialShell = ({ children }) => (
  <div className="min-h-screen md:grid md:h-screen md:grid-cols-[1.15fr_0.85fr] md:overflow-hidden">
    <section className="editorial-auth-panel relative hidden overflow-hidden md:block md:h-screen">
      <div className="absolute inset-0 flex items-center justify-center bg-[#1f241d] p-4">
        <img
          src="/environmental-protection-force-auth.svg"
          alt="Environmental Protection Force emblem"
          className="h-full w-full object-contain object-center"
          style={{ clipPath: 'inset(3.5% 3.5% 3.5% 3.5%)' }}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.02)_18%,rgba(0,0,0,0.18)_100%)]" />
    </section>

    <section className="editorial-auth-shell flex min-h-screen items-center justify-center px-6 py-8 md:h-screen md:min-h-0 md:px-10 md:py-5">
      <div className="w-full max-w-xl">{children}</div>
    </section>
  </div>
);

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthReady, login, user } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const successMessage = useMemo(() => location.state?.successMessage || '', [location.state]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const response = await authService.login(formData.email, formData.password);
      login(response.user);
      navigate(getRedirectPath(response.user.role), { replace: true });
    } catch (error) {
      setErrorMessage(error.message || 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthReady) {
    return null;
  }

  if (user?.role) {
    return <Navigate to={getRedirectPath(user.role)} replace />;
  }

  return (
    <EditorialShell>
      <div className="editorial-auth-card p-6 sm:p-8">
        <div className="editorial-rule-label">
          <span>Sign In</span>
        </div>

        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="editorial-auth-title text-3xl sm:text-4xl">Welcome back</h2>
            <p className="editorial-auth-copy mt-3 max-w-md text-sm sm:text-base">
              Use your institution credentials to continue with exams, monitoring, and grading.
            </p>
          </div>
          <div className="hidden h-14 w-14 items-center justify-center rounded-full border border-editorialBorder bg-editorialMuted text-editorialAccent sm:inline-flex">
            <Feather size={24} strokeWidth={2.5} />
          </div>
        </div>

        {successMessage ? <div className="editorial-status editorial-status--success mt-6">{successMessage}</div> : null}
        {errorMessage ? <div className="editorial-status editorial-status--error mt-6">{errorMessage}</div> : null}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="editorial-input-label">Email address</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              className="editorial-input"
            />
          </label>

          <label className="block">
            <span className="editorial-input-label">Password</span>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                className="editorial-input pr-14"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-editorialBorder bg-white text-editorialMutedFg transition-all duration-200 ease-out hover:border-editorialAccent hover:text-editorialAccent"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
              </button>
            </div>
          </label>

          <div className="flex items-center justify-between gap-4">
            <div className="editorial-auth-pill">
              <LockKeyhole size={14} strokeWidth={2.5} />
              Secure access
            </div>
            <Link className="editorial-link font-editorialBody text-sm" to="/forgot-password">
              Forgot password?
            </Link>
          </div>

          <button type="submit" disabled={isSubmitting} className="editorial-primary-button">
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="editorial-auth-copy mt-6 text-sm">
          New student?{' '}
          <Link className="editorial-link font-semibold" to="/signup">
            Sign up with an invite code
          </Link>
        </p>
      </div>
    </EditorialShell>
  );
};

export default LoginPage;
