import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as authService from '../../services/authService';

const DotGrid = () => (
  <svg className="absolute inset-0 h-full w-full opacity-20" aria-hidden="true">
    <defs>
      <pattern id="signup-dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="3" r="2" fill="white" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#signup-dot-grid)" />
  </svg>
);

const FloatingShapes = () => (
  <>
    <svg className="absolute left-16 top-20 h-24 w-24 -rotate-6" viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="42" fill="#FB7185" stroke="#1F2937" strokeWidth="4" />
    </svg>
    <svg className="absolute right-10 top-28 h-24 w-24 rotate-12" viewBox="0 0 120 120" fill="none">
      <path d="M60 10L110 100H10L60 10Z" fill="#60A5FA" stroke="#1F2937" strokeWidth="4" />
    </svg>
    <svg className="absolute bottom-24 left-20 h-20 w-20 rotate-6" viewBox="0 0 100 100" fill="none">
      <rect x="10" y="10" width="80" height="80" rx="18" fill="#FBBF24" stroke="#1F2937" strokeWidth="4" />
    </svg>
    <div className="absolute bottom-16 right-14 h-16 w-16 rounded-full border-2 border-foreground bg-tertiary shadow-pop-press" />
  </>
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

const roleOptions = [
  { label: 'Student', value: 'student' },
  { label: 'Teacher', value: 'teacher' },
];

const SignupPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await authService.register(formData.name, formData.email, formData.password, formData.role);
      navigate('/login', {
        replace: true,
        state: {
          successMessage: 'Account created successfully. Sign in to continue.',
        },
      });
    } catch (error) {
      setErrorMessage(error.message || 'Unable to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user?.role) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-secondary md:flex md:min-h-screen md:flex-col md:justify-between md:p-12">
        <DotGrid />
        <FloatingShapes />
        <div className="relative z-10 max-w-md pt-10 text-white">
          <span className="inline-flex rounded-full border-2 border-white/80 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] shadow-pop-press backdrop-blur-sm">
            Create your workspace
          </span>
          <h1 className="mt-10 text-6xl font-heading font-extrabold leading-none">Join the Flow</h1>
          <SquiggleUnderline />
          <p className="mt-6 max-w-sm text-lg leading-8 text-white/80">
            Set up your student or teacher account and jump into beautifully organized assessments.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-10 md:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="rounded-[2rem] border-2 border-foreground bg-card p-8 shadow-pop">
            <span className="inline-flex rounded-full border-2 border-foreground bg-muted px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-foreground shadow-pop-soft">
              Let&apos;s get started
            </span>
            <h2 className="mt-6 text-3xl font-heading font-extrabold text-foreground">Create Account</h2>
            <p className="mt-3 text-sm leading-6 text-mutedFg">
              Choose your role and create an account for the testing platform.
            </p>

            {errorMessage ? (
              <div className="mt-6 rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
                {errorMessage}
              </div>
            ) : null}

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <AuthInput
                label="Name"
                name="name"
                autoComplete="name"
                placeholder="Areeba Khan"
                value={formData.name}
                onChange={handleChange}
                required
              />
              <AuthInput
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <AuthInput
                label="Password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Create a secure password"
                value={formData.password}
                onChange={handleChange}
                required
              />

              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Role</legend>
                <div className="flex flex-wrap gap-3">
                  {roleOptions.map((roleOption) => {
                    const isSelected = formData.role === roleOption.value;

                    return (
                      <label key={roleOption.value} className="cursor-pointer">
                        <input
                          type="radio"
                          name="role"
                          value={roleOption.value}
                          checked={isSelected}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <span
                          className={`inline-flex rounded-full border-2 px-5 py-3 text-sm font-bold shadow-pop-soft transition-all duration-200 ease-bounce ${
                            isSelected
                              ? 'border-foreground bg-accent text-accentFg shadow-pop'
                              : 'border-border bg-muted text-foreground'
                          }`}
                        >
                          {roleOption.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full border-2 border-foreground bg-accent px-6 py-3 text-base font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <p className="mt-6 text-sm text-mutedFg">
              Already have an account?{' '}
              <Link className="font-bold text-accent underline decoration-2 underline-offset-4" to="/login">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SignupPage;
