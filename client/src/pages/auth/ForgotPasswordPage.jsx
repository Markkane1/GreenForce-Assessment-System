import { Mail } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as authService from '../../services/authService';

const ForgotPasswordPage = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  if (user?.role) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await authService.forgotPassword(email);
      setIsSent(true);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to send reset link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen md:grid md:grid-cols-[1.05fr_0.95fr]">
      <section className="editorial-auth-panel relative hidden min-h-screen overflow-hidden px-12 py-14 text-white md:flex md:flex-col md:justify-between">
        <div className="relative z-10 max-w-xl">
          <div className="editorial-rule-label">
            <span>Account Recovery</span>
          </div>
          <h1 className="font-editorial text-6xl font-semibold leading-[1.05] tracking-[-0.02em] text-[#FAFAF8]">
            Request a secure reset link.
          </h1>
          <p className="mt-8 max-w-lg font-editorialBody text-lg leading-8 tracking-[0.01em] text-white/72">
            Reset access without exposing whether an account exists. The response remains intentionally generic.
          </p>
        </div>
      </section>

      <section className="editorial-auth-shell flex min-h-screen items-center justify-center px-6 py-10 md:px-12">
        <div className="w-full max-w-xl">
          <div className="editorial-auth-card p-8 sm:p-10">
            <div className="editorial-rule-label">
              <span>Password reset</span>
            </div>
            <h2 className="editorial-auth-title text-4xl">Send reset link</h2>
            <p className="editorial-auth-copy mt-4 max-w-md text-base">
              Enter your email address and a reset token will be issued if the account is registered.
            </p>

            {errorMessage ? <div className="editorial-status editorial-status--error mt-8">{errorMessage}</div> : null}

            {isSent ? (
              <div className="mt-8 rounded-2xl border border-quaternary bg-quaternary/12 p-6 shadow-editorialMd">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-quaternary shadow-editorialSm">
                    <Mail size={22} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-heading text-2xl font-semibold text-foreground">Check your inbox</h3>
                    <p className="mt-1 font-body text-sm leading-6 text-mutedFg">
                      If that email is registered, a reset link is on its way.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="editorial-input-label">Email address</span>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className="editorial-input"
                  />
                </label>
                <button type="submit" disabled={isSubmitting} className="editorial-primary-button">
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            )}

            <div className="mt-8">
              <Link className="editorial-link font-editorialBody text-sm font-semibold" to="/login">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ForgotPasswordPage;
