import { Mail } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as authService from '../../services/authService';

const FloatingShapes = () => (
  <>
    <div className="absolute -left-6 top-16 h-24 w-24 rotate-6 rounded-full border-2 border-foreground bg-secondary shadow-pop-press" />
    <svg className="absolute right-16 top-24 h-24 w-24 -rotate-12" viewBox="0 0 120 120" fill="none">
      <path d="M60 10L110 100H10L60 10Z" fill="#A78BFA" stroke="#1F2937" strokeWidth="4" />
    </svg>
    <svg className="absolute bottom-28 left-20 h-20 w-20 rotate-12" viewBox="0 0 100 100" fill="none">
      <rect x="10" y="10" width="80" height="80" rx="18" fill="#34D399" stroke="#1F2937" strokeWidth="4" />
    </svg>
    <div className="absolute bottom-16 right-12 h-16 w-16 -rotate-6 rounded-full border-2 border-foreground bg-accent shadow-pop-press" />
  </>
);

const DotGrid = () => (
  <svg className="absolute inset-0 h-full w-full opacity-20" aria-hidden="true">
    <defs>
      <pattern id="forgot-password-dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="3" r="2" fill="white" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#forgot-password-dot-grid)" />
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
    <div className="min-h-screen bg-background md:grid md:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-tertiary md:flex md:min-h-screen md:flex-col md:justify-between md:p-12">
        <DotGrid />
        <FloatingShapes />
        <div className="relative z-10 max-w-md pt-10 text-white">
          <span className="inline-flex rounded-full border-2 border-white/80 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] shadow-pop-press backdrop-blur-sm">
            Account Recovery
          </span>
          <h1 className="mt-10 text-6xl font-heading font-extrabold leading-none">Reset Access</h1>
          <p className="mt-6 max-w-sm text-lg leading-8 text-white/80">
            Request a reset link and regain access without exposing whether an email is registered.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-10 md:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="rounded-[2rem] border-2 border-foreground bg-card p-8 shadow-pop">
            <span className="inline-flex rounded-full border-2 border-foreground bg-muted px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-foreground shadow-pop-soft">
              Forgot password
            </span>
            <h2 className="mt-6 text-3xl font-heading font-extrabold text-foreground">Send Reset Link</h2>
            <p className="mt-3 text-sm leading-6 text-mutedFg">
              Enter your email address and we will issue a secure reset token.
            </p>

            {errorMessage ? (
              <div className="mt-6 rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
                {errorMessage}
              </div>
            ) : null}

            {isSent ? (
              <div className="mt-8 rounded-[1.5rem] border-2 border-foreground bg-quaternary p-6 shadow-pop">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground bg-card shadow-pop-press">
                    <Mail size={22} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-heading text-xl font-extrabold text-foreground">Check your inbox</h3>
                    <p className="mt-1 text-sm text-foreground/80">
                      If that email is registered, a reset link is on its way.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <AuthInput
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="student@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-full border-2 border-foreground bg-accent px-6 py-3 text-base font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            )}

            <div className="mt-6">
              <Link
                className="inline-flex rounded-full border-2 border-foreground bg-secondary px-5 py-2.5 text-sm font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover"
                to="/login"
              >
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
