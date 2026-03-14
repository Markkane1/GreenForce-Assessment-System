import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as authService from '../../services/authService';

const PasswordField = ({ label, value, onChange, visible, onToggle, autoComplete, errorMessage }) => (
  <label className="block">
    <span className="editorial-input-label">{label}</span>
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        className="editorial-input pr-14"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-editorialBorder bg-white text-editorialMutedFg transition-all duration-200 ease-out hover:border-editorialAccent hover:text-editorialAccent"
      >
        {visible ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
      </button>
    </div>
    {errorMessage ? <p className="mt-2 font-body text-sm text-[#7C2D12]">{errorMessage}</p> : null}
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

  useEffect(() => {
    if (!token) {
      setErrorMessage('Reset token is missing. Request a new reset link.');
    }
  }, [token]);

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
    <div className="min-h-screen md:grid md:grid-cols-[1.05fr_0.95fr]">
      <section className="editorial-auth-panel relative hidden min-h-screen overflow-hidden px-12 py-14 text-white md:flex md:flex-col md:justify-between">
        <div className="relative z-10 max-w-xl">
          <div className="editorial-rule-label">
            <span>Secure Reset</span>
          </div>
          <h1 className="font-editorial text-6xl font-semibold leading-[1.05] tracking-[-0.02em] text-[#FAFAF8]">
            Create a new password.
          </h1>
          <p className="mt-8 max-w-lg font-editorialBody text-lg leading-8 tracking-[0.01em] text-white/72">
            Complete the reset with a strong password that is appropriate for an assessment platform.
          </p>
        </div>
      </section>

      <section className="editorial-auth-shell flex min-h-screen items-center justify-center px-6 py-10 md:px-12">
        <div className="w-full max-w-xl">
          <div className="editorial-auth-card p-8 sm:p-10">
            <div className="editorial-rule-label">
              <span>Reset password</span>
            </div>
            <h2 className="editorial-auth-title text-4xl">Create new password</h2>
            <p className="editorial-auth-copy mt-4 max-w-md text-base">
              Enter and confirm your new password to complete the reset flow.
            </p>

            {errorMessage ? <div className="editorial-status editorial-status--error mt-8">{errorMessage}</div> : null}

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <PasswordField
                label="New password"
                autoComplete="new-password"
                value={formData.newPassword}
                onChange={(event) => setFormData((current) => ({ ...current, newPassword: event.target.value }))}
                visible={showPassword}
                onToggle={() => setShowPassword((current) => !current)}
                errorMessage={passwordError}
              />
              <PasswordField
                label="Confirm password"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={(event) => setFormData((current) => ({ ...current, confirmPassword: event.target.value }))}
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((current) => !current)}
                errorMessage={confirmError}
              />
              <button type="submit" disabled={isSubmitting || !token} className="editorial-primary-button">
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>

            {errorMessage ? (
              <div className="mt-8">
                <Link className="editorial-link font-editorialBody text-sm font-semibold" to="/forgot-password">
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
