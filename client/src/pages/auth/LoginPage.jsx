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

const EditorialShell = ({ eyebrow, title, copy, children }) => (
  <div className="min-h-screen md:grid md:grid-cols-[1.05fr_0.95fr]">
    <section className="editorial-auth-panel relative hidden min-h-screen overflow-hidden px-12 py-14 text-white md:flex md:flex-col md:justify-between">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(212,168,75,0.18),_transparent_46%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-xl text-center">
        <div className="editorial-rule-label">
          <span>{eyebrow}</span>
        </div>
        <h1 className="font-editorial text-6xl font-semibold leading-[1.05] tracking-[-0.02em] text-[#FAFAF8]">
          {title}
        </h1>
        <p className="mx-auto mt-8 max-w-lg font-editorialBody text-lg leading-8 tracking-[0.01em] text-white/72">
          {copy}
        </p>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center">
        <div className="rounded-[2rem] bg-[#F5F5F0] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)] ring-1 ring-white/10">
          <img
            src="/epa-auth-logo.svg"
            alt="EPA logo"
            className="w-[30rem] max-w-[78vw] object-contain"
          />
        </div>
      </div>

      <div className="relative z-10 grid max-w-lg gap-4 self-center">
        <div className="rounded-2xl border border-white/12 bg-white/4 p-6 backdrop-blur-sm">
          <div className="editorial-auth-kicker text-[#D4A84B]">Exam integrity</div>
          <p className="mt-4 font-editorial text-2xl text-[#FAFAF8]">Focused, secure, and intentionally quiet.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/4 p-5 backdrop-blur-sm">
            <div className="editorial-auth-kicker text-[#D4A84B]">Delivery</div>
            <p className="mt-3 font-editorialBody text-sm leading-6 text-white/70">
              Deterministic question order and timed exam sessions.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/4 p-5 backdrop-blur-sm">
            <div className="editorial-auth-kicker text-[#D4A84B]">Assessment</div>
            <p className="mt-3 font-editorialBody text-sm leading-6 text-white/70">
              Auto-graded MCQs and structured essay review.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section className="editorial-auth-shell flex min-h-screen items-center justify-center px-6 py-10 md:px-12">
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
    <EditorialShell
      eyebrow="ENVIRONMENTAL PROTECTION AGENCY, PUNJAB"
      title="Green Force Assessment System"
      copy="Access schedules, grading, and exam activity through a quieter editorial interface designed for exam delivery and review."
    >
      <div className="editorial-auth-card p-8 sm:p-10">
        <div className="editorial-rule-label">
          <span>Sign In</span>
        </div>

        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="editorial-auth-title text-4xl">Welcome back</h2>
            <p className="editorial-auth-copy mt-4 max-w-md text-base">
              Use your institution credentials to continue with exams, monitoring, and grading.
            </p>
          </div>
          <div className="hidden h-14 w-14 items-center justify-center rounded-full border border-editorialBorder bg-editorialMuted text-editorialAccent sm:inline-flex">
            <Feather size={24} strokeWidth={2.5} />
          </div>
        </div>

        {successMessage ? <div className="editorial-status editorial-status--success mt-8">{successMessage}</div> : null}
        {errorMessage ? <div className="editorial-status editorial-status--error mt-8">{errorMessage}</div> : null}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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

        <p className="editorial-auth-copy mt-8 text-sm">
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
