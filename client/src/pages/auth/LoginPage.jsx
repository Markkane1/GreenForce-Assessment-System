import { Eye, EyeOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as authService from '../../services/authService';

const FloatingShapes = () => (
  <>
    <div className="absolute -left-6 top-16 h-24 w-24 rotate-6 rounded-full border-2 border-foreground bg-secondary shadow-pop-press" />
    <svg className="absolute right-16 top-24 h-24 w-24 -rotate-12 drop-shadow-none" viewBox="0 0 120 120" fill="none">
      <path d="M60 10L110 100H10L60 10Z" fill="#60A5FA" stroke="#1F2937" strokeWidth="4" />
    </svg>
    <svg className="absolute bottom-28 left-20 h-20 w-20 rotate-12" viewBox="0 0 100 100" fill="none">
      <rect x="10" y="10" width="80" height="80" rx="18" fill="#FBBF24" stroke="#1F2937" strokeWidth="4" />
    </svg>
    <div className="absolute bottom-16 right-12 h-16 w-16 -rotate-6 rounded-full border-2 border-foreground bg-quaternary shadow-pop-press" />
  </>
);

const DotGrid = () => (
  <svg className="absolute inset-0 h-full w-full opacity-20" aria-hidden="true">
    <defs>
      <pattern id="login-dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="3" r="2" fill="white" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#login-dot-grid)" />
  </svg>
);

const SquiggleUnderline = () => (
  <svg className="mt-3 h-4 w-40" viewBox="0 0 160 16" fill="none" aria-hidden="true">
    <path
      d="M2 10C18 2 34 2 50 10C66 18 82 18 98 10C114 2 130 2 146 10"
      stroke="white"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

const AuthInput = ({ label, type = 'text', ...props }) => (
  <label className="block space-y-2">
    <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">{label}</span>
    <input
      type={type}
      className="w-full rounded-lg border-2 border-foreground bg-card px-4 py-3 text-base text-foreground shadow-pop-soft outline-none transition-all duration-200 ease-bounce placeholder:text-mutedFg focus:-translate-y-0.5 focus:shadow-pop"
      {...props}
    />
  </label>
);

const getRedirectPath = (role) => {
  if (role === 'admin') {
    return '/admin/dashboard';
  }

  if (role === 'teacher') {
    return '/teacher/dashboard';
  }

  return '/student/dashboard';
};

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
    <div className="min-h-screen bg-background md:grid md:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-accent md:flex md:min-h-screen md:flex-col md:justify-between md:p-12">
        <DotGrid />
        <FloatingShapes />
        <div className="relative z-10 max-w-md pt-10 text-white">
          <span className="inline-flex rounded-full border-2 border-white/80 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] shadow-pop-press backdrop-blur-sm">
            Online Testing Suite
          </span>
          <h1 className="mt-10 text-6xl font-heading font-extrabold leading-none">Welcome Back</h1>
          <SquiggleUnderline />
          <p className="mt-6 max-w-sm text-lg leading-8 text-white/80">
            Jump back into your exams, grading queues, and classroom workflows with a crisp playful interface.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-10 md:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="rounded-[2rem] border-2 border-foreground bg-card p-8 shadow-pop">
            <span className="inline-flex rounded-full border-2 border-foreground bg-muted px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-foreground shadow-pop-soft">
              Sign in to continue
            </span>
            <h2 className="mt-6 text-3xl font-heading font-extrabold text-foreground">Sign In</h2>
            <p className="mt-3 text-sm leading-6 text-mutedFg">
              Use your exam portal credentials to continue where you left off.
            </p>

            {successMessage ? (
              <div className="mt-6 rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
                {successMessage}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mt-6 rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
                {errorMessage}
              </div>
            ) : null}

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <AuthInput
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="teacher@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />

              <label className="block space-y-2">
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Password</span>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border-2 border-foreground bg-card px-4 py-3 pr-14 text-base text-foreground shadow-pop-soft outline-none transition-all duration-200 ease-bounce placeholder:text-mutedFg focus:-translate-y-0.5 focus:shadow-pop"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-2 border-foreground bg-secondary text-foreground shadow-pop-press transition-all duration-200 ease-bounce hover:-translate-y-[55%]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <div className="flex justify-end">
                <Link className="text-sm font-body text-accent hover:underline" to="/forgot-password">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full border-2 border-foreground bg-accent px-6 py-3 text-base font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <p className="mt-6 text-sm text-mutedFg">
              New student?{' '}
              <Link className="font-bold text-accent underline decoration-2 underline-offset-4" to="/signup">
                Sign up with an invite code
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
