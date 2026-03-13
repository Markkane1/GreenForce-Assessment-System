import {
  CheckCircle,
  ChevronLeft,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as authService from '../../services/authService';

const DotGrid = ({ patternId }) => (
  <svg className="absolute inset-0 h-full w-full opacity-20" aria-hidden="true">
    <defs>
      <pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="3" r="2" fill="white" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill={`url(#${patternId})`} />
  </svg>
);

const FloatingShapes = ({ step }) => (
  <>
    <div
      className={`absolute left-12 top-16 h-24 w-24 rotate-6 rounded-full border-2 border-foreground shadow-pop-press ${
        step === 1 ? 'bg-secondary' : 'bg-tertiary'
      }`}
    />
    <svg className="absolute right-12 top-24 h-24 w-24 -rotate-12" viewBox="0 0 120 120" fill="none">
      <path d="M60 10L110 100H10L60 10Z" fill="#60A5FA" stroke="#1F2937" strokeWidth="4" />
    </svg>
    <svg className="absolute bottom-24 left-20 h-20 w-20 rotate-6" viewBox="0 0 100 100" fill="none">
      <rect x="10" y="10" width="80" height="80" rx="18" fill="#FBBF24" stroke="#1F2937" strokeWidth="4" />
    </svg>
    <div
      className={`absolute bottom-16 right-12 h-16 w-16 -rotate-6 rounded-full border-2 border-foreground shadow-pop-press ${
        step === 1 ? 'bg-tertiary' : 'bg-quaternary'
      }`}
    />
  </>
);

const ProgressDots = ({ step }) => (
  <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2">
    <span className={`h-3 w-3 rounded-full ${step >= 1 ? 'bg-white' : 'bg-white/40'}`} />
    <span className={`h-3 w-3 rounded-full ${step >= 2 ? 'bg-white' : 'bg-white/40'}`} />
  </div>
);

const AuthInput = ({ label, helperText, className = '', ...props }) => (
  <label className="block space-y-2">
    <span className="text-xs font-medium uppercase tracking-[0.18em] text-mutedFg">{label}</span>
    <input
      className={`w-full rounded-lg border-2 border-foreground bg-card px-4 py-3 text-base text-foreground shadow-pop-soft outline-none transition-all duration-200 ease-bounce placeholder:text-mutedFg focus:-translate-y-0.5 focus:shadow-pop ${className}`}
      {...props}
    />
    {helperText ? <span className="text-xs text-mutedFg">{helperText}</span> : null}
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

const normalizeInviteCode = (value) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-{2,}/g, '-');

const getPhoneDigits = (value) => value.replace(/\D/g, '');

const getPasswordScore = (value) => {
  let score = 0;

  if (value.length >= 8) {
    score += 1;
  }
  if (/\d/.test(value)) {
    score += 1;
  }
  if (/[A-Z]/.test(value)) {
    score += 1;
  }
  if (/[^A-Za-z0-9]/.test(value)) {
    score += 1;
  }

  return score;
};

const SignupPage = () => {
  const navigate = useNavigate();
  const { isAuthReady, user } = useAuth();
  const [step, setStep] = useState(1);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteData, setInviteData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isInviteSubmitting, setIsInviteSubmitting] = useState(false);
  const [isInviteValidated, setIsInviteValidated] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const [isAccountSubmitting, setIsAccountSubmitting] = useState(false);
  const [successCountdown, setSuccessCountdown] = useState(3);
  const [isSuccess, setIsSuccess] = useState(false);
  const transitionTimerRef = useRef(null);
  const resetTimerRef = useRef(null);
  const successIntervalRef = useRef(null);
  const successTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      window.clearTimeout(transitionTimerRef.current);
      window.clearTimeout(resetTimerRef.current);
      window.clearInterval(successIntervalRef.current);
      window.clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const normalizedInviteCode = normalizeInviteCode(inviteCode);
  const passwordScore = getPasswordScore(formData.password);
  const isNameValid = formData.name.trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
  const isPhoneValid = getPhoneDigits(formData.phone).length >= 7;
  const isPasswordValid = formData.password.length >= 8;
  const isFormValid = isNameValid && isEmailValid && isPhoneValid && isPasswordValid && inviteData;

  const handleInviteChange = (event) => {
    const nextCode = normalizeInviteCode(event.target.value);
    setInviteCode(nextCode);
    setErrorMessage('');
    setIsInviteValidated(false);

    if (inviteData?.code !== nextCode) {
      setInviteData(null);
    }

    if (shouldShake) {
      setShouldShake(false);
    }
  };

  const handleInviteSubmit = async (event) => {
    event.preventDefault();

    if (normalizedInviteCode.length < 5) {
      return;
    }

    setErrorMessage('');
    setIsInviteSubmitting(true);
    setIsInviteValidated(false);
    window.clearTimeout(transitionTimerRef.current);

    try {
      const response = await authService.validateInviteCode(normalizedInviteCode);

      if (!response.valid) {
        throw new Error(response.message || 'This code is invalid or has already been used');
      }

      setInviteData({
        code: normalizedInviteCode,
        groupId: response.groupId,
        groupName: response.groupName,
      });
      setIsInviteValidated(true);

      transitionTimerRef.current = window.setTimeout(() => {
        setStep(2);
      }, 600);
    } catch (error) {
      setErrorMessage(error.message || 'This code is invalid or has already been used');
      setShouldShake(true);
      resetTimerRef.current = window.setTimeout(() => {
        setShouldShake(false);
      }, 500);
    } finally {
      setIsInviteSubmitting(false);
    }
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === 'phone' ? value.replace(/[^0-9+\-() ]/g, '') : value;

    setFormData((current) => ({
      ...current,
      [name]: nextValue,
    }));
    setErrorMessage('');
  };

  const handleAccountSubmit = async (event) => {
    event.preventDefault();

    if (!inviteData || !isFormValid) {
      return;
    }

    setErrorMessage('');
    setIsAccountSubmitting(true);

    try {
      await authService.registerStudent(
        formData.name,
        formData.email,
        formData.phone,
        formData.password,
        inviteData.code,
      );

      setIsSuccess(true);
      setSuccessCountdown(3);

      successIntervalRef.current = window.setInterval(() => {
        setSuccessCountdown((current) => Math.max(current - 1, 0));
      }, 1000);

      successTimeoutRef.current = window.setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: {
            successMessage: 'Account created successfully. Sign in to continue.',
          },
        });
      }, 3000);
    } catch (error) {
      const message = error.message || 'Unable to create account. Please try again.';
      setErrorMessage(message);

      if (/invite code/i.test(message) || /already used/i.test(message) || /expired/i.test(message)) {
        resetTimerRef.current = window.setTimeout(() => {
          setStep(1);
          setInviteData(null);
          setIsInviteValidated(false);
        }, 2000);
      }
    } finally {
      setIsAccountSubmitting(false);
    }
  };

  if (!isAuthReady) {
    return null;
  }

  if (user?.role) {
    return <Navigate to={getRedirectPath(user.role)} replace />;
  }

  const leftPanelClass = step === 1 ? 'bg-quaternary' : 'bg-accent';
  const patternId = step === 1 ? 'signup-step-one-grid' : 'signup-step-two-grid';

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-2">
      <section className={`relative hidden overflow-hidden md:flex md:min-h-screen md:flex-col md:justify-between md:p-12 ${leftPanelClass}`}>
        <DotGrid patternId={patternId} />
        <FloatingShapes step={step} />
        <div className="relative z-10 max-w-md pt-10 text-white">
          <span className="inline-flex rounded-full border-2 border-white/80 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] shadow-pop-press backdrop-blur-sm">
            Student onboarding
          </span>
          <h1 className="mt-10 text-6xl font-heading font-extrabold leading-none">
            {step === 1 ? 'Unlock Your Invite' : 'Create Your Access'}
          </h1>
          <p className="mt-6 max-w-sm text-lg leading-8 text-white/80">
            {step === 1
              ? 'Use the invite code from your institution to verify your place before creating an account.'
              : 'Finish your student account setup and join the assigned group in one step.'}
          </p>
        </div>
        <ProgressDots step={step} />
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-10 md:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="rounded-[2rem] border-2 border-foreground bg-card p-8 shadow-pop">
            {step === 1 ? (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-foreground bg-accent text-white shadow-pop">
                  <KeyRound size={26} strokeWidth={2.5} />
                </div>
                <h2 className="mt-6 text-center text-3xl font-heading font-extrabold text-foreground">Enter Invite Code</h2>
                <p className="mt-3 text-center text-sm leading-6 text-mutedFg">
                  You need an invite code from your institution to create an account.
                </p>

                {errorMessage ? (
                  <div className="mt-6 rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-center text-sm font-medium text-foreground">
                    {errorMessage}
                  </div>
                ) : null}

                <form className="mt-8 space-y-5" onSubmit={handleInviteSubmit}>
                  <label className="block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-mutedFg">Invite Code</span>
                    <div
                      className={`relative rounded-lg border-2 bg-card px-4 py-3 shadow-pop-soft transition-all duration-200 ease-bounce focus-within:-translate-y-0.5 focus-within:shadow-pop ${
                        isInviteValidated ? 'border-quaternary' : 'border-foreground'
                      } ${shouldShake ? 'animate-shake' : ''}`}
                    >
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={handleInviteChange}
                        placeholder="E.G. TIGER-CLOUD-47"
                        className="w-full bg-transparent text-center font-heading text-2xl font-bold uppercase tracking-[0.18em] text-foreground outline-none placeholder:text-mutedFg"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck="false"
                      />
                      {isInviteValidated ? (
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-quaternary">
                          <CheckCircle size={22} strokeWidth={2.5} />
                        </span>
                      ) : null}
                    </div>
                  </label>

                  <button
                    type="submit"
                    disabled={normalizedInviteCode.length < 5 || isInviteSubmitting}
                    className="w-full rounded-full border-2 border-foreground bg-accent px-6 py-3 text-base font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isInviteSubmitting ? 'Checking Code...' : 'Continue'}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-mutedFg">
                  Already have an account?{' '}
                  <Link className="font-bold text-accent underline decoration-2 underline-offset-4" to="/login">
                    Sign in
                  </Link>
                </p>
              </>
            ) : isSuccess ? (
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-foreground bg-quaternary text-white shadow-pop animate-pop-in">
                  <CheckCircle size={34} strokeWidth={2.5} />
                </div>
                <h2 className="mt-6 text-3xl font-heading font-extrabold text-foreground">Welcome aboard!</h2>
                <p className="mt-3 text-sm leading-6 text-mutedFg">
                  Your account has been created. You have been added to {inviteData?.groupName}.
                </p>
                <p className="mt-4 text-xs text-mutedFg">Redirecting to login in {successCountdown} seconds...</p>
                <button
                  type="button"
                  onClick={() =>
                    navigate('/login', {
                      replace: true,
                      state: {
                        successMessage: 'Account created successfully. Sign in to continue.',
                      },
                    })
                  }
                  className="mt-7 w-full rounded-full border-2 border-foreground bg-accent px-6 py-3 text-base font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
                >
                  Go to Login
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setErrorMessage('');
                  }}
                  className="inline-flex items-center gap-2 text-sm font-medium text-mutedFg transition-colors hover:text-foreground"
                >
                  <ChevronLeft size={18} strokeWidth={2.5} />
                  Back
                </button>

                <div className="mt-5 inline-flex rounded-full border-2 border-accent bg-accent/10 px-4 py-2 font-heading text-sm font-bold text-accent">
                  Joining: {inviteData?.groupName}
                </div>

                <h2 className="mt-6 text-3xl font-heading font-extrabold text-foreground">Create Your Account</h2>

                {errorMessage ? (
                  <div className="mt-6 rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
                    {errorMessage}
                  </div>
                ) : null}

                <form className="mt-8 space-y-5" onSubmit={handleAccountSubmit}>
                  <AuthInput
                    label="Full Name"
                    name="name"
                    autoComplete="name"
                    placeholder="Your full name"
                    value={formData.name}
                    onChange={handleFormChange}
                  />
                  <AuthInput
                    label="Email Address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleFormChange}
                  />
                  <AuthInput
                    label="Phone Number"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+92 300 1234567"
                    helperText="Include country code"
                    value={formData.phone}
                    onChange={handleFormChange}
                  />

                  <label className="block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-mutedFg">Password</span>
                    <div className="relative">
                      <input
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Minimum 8 characters"
                        value={formData.password}
                        onChange={handleFormChange}
                        className="w-full rounded-lg border-2 border-foreground bg-card px-4 py-3 pr-14 text-base text-foreground shadow-pop-soft outline-none transition-all duration-200 ease-bounce placeholder:text-mutedFg focus:-translate-y-0.5 focus:shadow-pop"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-2 border-foreground bg-secondary text-foreground shadow-pop-press transition-all duration-200 ease-bounce hover:-translate-y-[55%]"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from({ length: 4 }).map((_, index) => {
                        const isActive = passwordScore > index;
                        let toneClass = 'bg-muted';

                        if (isActive) {
                          if (index === 0) toneClass = 'bg-secondary';
                          if (index === 1) toneClass = 'bg-tertiary';
                          if (index === 2) toneClass = 'bg-accent';
                          if (index === 3) toneClass = 'bg-quaternary';
                        }

                        return <span key={index} className={`h-2 rounded-full ${toneClass}`} />;
                      })}
                    </div>
                  </label>

                  <button
                    type="submit"
                    disabled={!isFormValid || isAccountSubmitting}
                    className="w-full rounded-full border-2 border-foreground bg-accent px-6 py-3 text-base font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isAccountSubmitting ? 'Creating Account...' : 'Create Account'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SignupPage;
