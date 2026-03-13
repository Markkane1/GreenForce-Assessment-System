import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as authService from '../../services/authService';

const FloatingShapes = () => (
  <>
    <div className="absolute -left-6 top-16 h-24 w-24 rotate-6 rounded-full border-2 border-foreground bg-accent shadow-pop-press" />
    <svg className="absolute right-16 top-24 h-24 w-24 -rotate-12" viewBox="0 0 120 120" fill="none">
      <path d="M60 10L110 100H10L60 10Z" fill="#F472B6" stroke="#1F2937" strokeWidth="4" />
    </svg>
    <svg className="absolute bottom-28 left-20 h-20 w-20 rotate-12" viewBox="0 0 100 100" fill="none">
      <rect x="10" y="10" width="80" height="80" rx="18" fill="#FBBF24" stroke="#1F2937" strokeWidth="4" />
    </svg>
    <div className="absolute bottom-16 right-12 h-16 w-16 -rotate-6 rounded-full border-2 border-foreground bg-secondary shadow-pop-press" />
  </>
);

const DotGrid = () => (
  <svg className="absolute inset-0 h-full w-full opacity-20" aria-hidden="true">
    <defs>
      <pattern id="reset-password-dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="3" r="2" fill="white" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#reset-password-dot-grid)" />
  </svg>
);

const PasswordInput = ({ label, value, onChange, showPassword, onToggle, errorMessage, autoComplete }) => (
  <label className="block space-y-2">
    <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">{label}</span>
    <div className="relative">
      <input
        type={showPassword ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border-2 border-foreground bg-card px-4 py-3 pr-14 text-base text-foreground shadow-pop-soft outline-none transition-all duration-200 ease-bounce placeholder:text-mutedFg focus:-translate-y-0.5 focus:shadow-pop"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-2 border-foreground bg-secondary text-foreground shadow-pop-press transition-all duration-200 ease-bounce hover:-translate-y-[55%]"
        aria-label={showPassword ? `Hide ${label}` : `Show ${label}`}
      >
        {showPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
      </button>
    </div>
    {errorMessage ? <p className="text-sm font-medium text-secondary">{errorMessage}</p> : null}
  </label>
);

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const token = useMemo(() => new URLSearchParams(location.search).get('token') || '', [location.search]);
  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user?.role) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  const passwordError =
    formData.newPassword.length > 0 && formData.newPassword.length < 8
      ? 'Password must be at least 8 characters long.'
      : '';

  const confirmError =
    formData.confirmPassword.length > 0 && formData.confirmPassword !== formData.newPassword
      ? 'Passwords must match.'
      : '';

  useEffect(() => {
    if (!token) {
      setErrorMessage('Reset token is missing. Request a new reset link.');
    }
  }, [token]);

  const handleChange = (field) => (event) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      setErrorMessage('Reset token is missing. Request a new reset link.');
      return;
    }

    if (passwordError || confirmError) {
      setErrorMessage(passwordError || confirmError);
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await authService.resetPassword(token, formData.newPassword);
      navigate('/login', {
        replace: true,
        state: { successMessage: 'Password reset successful. Please sign in with your new password.' },
      });
    } catch (error) {
      setErrorMessage(error.message || 'Unable to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-secondary md:flex md:min-h-screen md:flex-col md:justify-between md:p-12">
        <DotGrid />
        <FloatingShapes />
        <div className="relative z-10 max-w-md pt-10 text-white">
          <span className="inline-flex rounded-full border-2 border-white/80 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] shadow-pop-press backdrop-blur-sm">
            Secure Reset
          </span>
          <h1 className="mt-10 text-6xl font-heading font-extrabold leading-none">Set New Password</h1>
          <p className="mt-6 max-w-sm text-lg leading-8 text-white/80">
            Choose a new password that is strong enough for a production exam platform.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-10 md:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="rounded-[2rem] border-2 border-foreground bg-card p-8 shadow-pop">
            <span className="inline-flex rounded-full border-2 border-foreground bg-muted px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-foreground shadow-pop-soft">
              Reset password
            </span>
            <h2 className="mt-6 text-3xl font-heading font-extrabold text-foreground">Create New Password</h2>
            <p className="mt-3 text-sm leading-6 text-mutedFg">
              Enter and confirm your new password to complete the reset flow.
            </p>

            {errorMessage ? (
              <div className="mt-6 rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
                {errorMessage}
              </div>
            ) : null}

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <PasswordInput
                label="New password"
                autoComplete="new-password"
                value={formData.newPassword}
                onChange={handleChange('newPassword')}
                showPassword={showPassword}
                onToggle={() => setShowPassword((current) => !current)}
                errorMessage={passwordError}
              />

              <PasswordInput
                label="Confirm password"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                showPassword={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((current) => !current)}
                errorMessage={confirmError}
              />

              <button
                type="submit"
                disabled={isSubmitting || !token}
                className="w-full rounded-full border-2 border-foreground bg-accent px-6 py-3 text-base font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>

            {errorMessage ? (
              <div className="mt-5">
                <Link className="text-sm font-body text-accent hover:underline" to="/forgot-password">
                  Request a new reset link
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ResetPasswordPage;
