import { CheckCircle, ChevronLeft, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
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

const normalizeInviteCode = (value) => {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-/, '')
    .replace(/-$/, '');
};

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

const EditorialSignupShell = ({ step, children }) => (
  <div className="min-h-screen md:grid md:grid-cols-[1.05fr_0.95fr]">
    <section className="editorial-auth-panel relative hidden min-h-screen overflow-hidden px-12 py-14 text-white md:flex md:flex-col md:justify-between">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(212,168,75,0.18),_transparent_46%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-xl text-center">
        <div className="editorial-rule-label">
          <span>EPA Punjab's Testing System</span>
        </div>
        <h1 className="font-editorial text-6xl font-semibold leading-[1.05] tracking-[-0.02em] text-[#FAFAF8]">
          Green Force Assessment System
        </h1>
        <p className="mx-auto mt-8 max-w-lg font-editorialBody text-lg leading-8 tracking-[0.01em] text-white/72">
          {step === 1
            ? 'Student registration is invite-gated. Validate your code first, then continue with your account details for the correct group.'
            : 'Your invite defines the group context. Complete your details once and the system will place you into the assigned cohort.'}
        </p>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center">
        <img
          src="/epa-auth-logo.svg"
          alt="EPA logo"
          className="w-72 max-w-[68%] opacity-[0.88]"
        />
      </div>

      <div className="relative z-10 space-y-4 self-center">
        <div className="rounded-2xl border border-white/12 bg-white/4 p-6 backdrop-blur-sm">
          <div className="editorial-auth-kicker text-[#D4A84B]">Process</div>
          <p className="mt-4 font-editorial text-2xl text-[#FAFAF8]">
            {step === 1 ? 'Validate before you create.' : 'Create once, join the correct group.'}
          </p>
        </div>
        <div className="flex gap-2">
          <span className={`editorial-progress-dot ${step >= 1 ? 'editorial-progress-dot--active' : ''}`} />
          <span className={`editorial-progress-dot ${step >= 2 ? 'editorial-progress-dot--active' : ''}`} />
        </div>
      </div>
    </section>

    <section className="editorial-auth-shell flex min-h-screen items-center justify-center px-6 py-10 md:px-12">
      <div className="w-full max-w-xl">{children}</div>
    </section>
  </div>
);

const StrengthBar = ({ score }) => {
  const tones = ['bg-secondary', 'bg-tertiary', 'bg-accent', 'bg-quaternary'];

  return (
    <div className="mt-3 grid grid-cols-4 gap-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <span
          key={index}
          className={`h-2 rounded-full ${score > index ? tones[index] : 'bg-[#E8E4DF]'}`}
        />
      ))}
    </div>
  );
};

const SignupPage = () => {
  const navigate = useNavigate();
  const { isAuthReady, user } = useAuth();
  const [step, setStep] = useState(1);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteData, setInviteData] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isInviteSubmitting, setIsInviteSubmitting] = useState(false);
  const [isInviteValidated, setIsInviteValidated] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const [isAccountSubmitting, setIsAccountSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successCountdown, setSuccessCountdown] = useState(3);
  const transitionTimerRef = useRef(null);
  const resetTimerRef = useRef(null);
  const successIntervalRef = useRef(null);
  const successTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      window.clearTimeout(transitionTimerRef.current);
      window.clearTimeout(resetTimerRef.current);
      window.clearTimeout(successTimeoutRef.current);
      window.clearInterval(successIntervalRef.current);
    };
  }, []);

  const passwordScore = useMemo(() => getPasswordScore(formData.password), [formData.password]);
  const normalizedInviteCode = useMemo(() => normalizeInviteCode(inviteCode), [inviteCode]);
  const isNameValid = formData.name.trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
  const isPhoneValid = getPhoneDigits(formData.phone).length >= 7;
  const isPasswordValid = formData.password.length >= 8;
  const isFormValid = Boolean(inviteData) && isNameValid && isEmailValid && isPhoneValid && isPasswordValid;

  const handleInviteChange = (event) => {
    const nextValue = normalizeInviteCode(event.target.value);
    setInviteCode(nextValue);
    setIsInviteValidated(false);
    setErrorMessage('');

    if (inviteData?.code !== nextValue) {
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

    setFormData((current) => ({ ...current, [name]: nextValue }));
    setErrorMessage('');
  };

  const handleAccountSubmit = async (event) => {
    event.preventDefault();

    if (!isFormValid || !inviteData) {
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
          state: { successMessage: 'Account created successfully. Sign in to continue.' },
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

  return (
    <EditorialSignupShell step={step}>
      <div className="editorial-auth-card p-8 sm:p-10">
        {step === 1 ? (
          <>
            <div className="editorial-rule-label">
              <span>Step One</span>
            </div>

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-editorialBorder bg-editorialMuted text-editorialAccent shadow-editorialSm">
              <KeyRound size={28} strokeWidth={2.5} />
            </div>

            <h2 className="editorial-auth-title mt-8 text-center text-4xl">Enter invite code</h2>
            <p className="editorial-auth-copy mx-auto mt-4 max-w-md text-center text-base">
              You need an invite code from your institution before a student account can be created.
            </p>

            {errorMessage ? <div className="editorial-status editorial-status--error mt-8 text-center">{errorMessage}</div> : null}

            <form className="mt-8 space-y-6" onSubmit={handleInviteSubmit}>
              <label className="block">
                <span className="editorial-input-label text-center">Invite code</span>
                <div className={`relative ${shouldShake ? 'animate-shake' : ''}`}>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={handleInviteChange}
                    placeholder="TIGER-CLOUD-47"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck="false"
                    className={`editorial-input editorial-input--centered pr-14 ${isInviteValidated ? 'border-[#7AA36A]' : ''}`}
                  />
                  {isInviteValidated ? (
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#7AA36A]">
                      <CheckCircle size={22} strokeWidth={2.5} />
                    </span>
                  ) : null}
                </div>
              </label>

              <button type="submit" disabled={normalizedInviteCode.length < 5 || isInviteSubmitting} className="editorial-primary-button">
                {isInviteSubmitting ? 'Validating code...' : 'Continue'}
              </button>
            </form>

            <p className="editorial-auth-copy mt-8 text-center text-sm">
              Already have an account?{' '}
              <Link className="editorial-link font-semibold" to="/login">
                Sign in
              </Link>
            </p>
          </>
        ) : isSuccess ? (
          <div className="text-center">
            <div className="editorial-rule-label">
              <span>Account created</span>
            </div>

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-editorialBorder bg-[#7AA36A]/12 text-[#355E3B] shadow-editorialMd animate-pop-in">
              <CheckCircle size={38} strokeWidth={2.5} />
            </div>

            <h2 className="editorial-auth-title mt-8 text-4xl">Welcome aboard</h2>
            <p className="editorial-auth-copy mx-auto mt-4 max-w-md text-base">
              Your account has been created. You have been added to {inviteData?.groupName}.
            </p>
            <p className="editorial-auth-copy mt-4 text-sm">
              Redirecting to login in {successCountdown} second{successCountdown === 1 ? '' : 's'}...
            </p>

            <button
              type="button"
              onClick={() =>
                navigate('/login', {
                  replace: true,
                  state: { successMessage: 'Account created successfully. Sign in to continue.' },
                })
              }
              className="editorial-primary-button mt-8"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setErrorMessage('');
                }}
                className="inline-flex items-center gap-2 font-editorialBody text-sm font-medium text-editorialMutedFg transition-colors duration-200 ease-out hover:text-editorialFg"
              >
                <ChevronLeft size={18} strokeWidth={2.5} />
                Back
              </button>
              <div className="editorial-auth-pill">Joining: {inviteData?.groupName}</div>
            </div>

            <div className="editorial-rule-label mt-6">
              <span>Step Two</span>
            </div>

            <h2 className="editorial-auth-title text-4xl">Create your account</h2>
            <p className="editorial-auth-copy mt-4 max-w-md text-base">
              Finish your student account with your name, contact details, and a password.
            </p>

            {errorMessage ? <div className="editorial-status editorial-status--error mt-8">{errorMessage}</div> : null}

            <form className="mt-8 space-y-6" onSubmit={handleAccountSubmit}>
              <label className="block">
                <span className="editorial-input-label">Full name</span>
                <input
                  name="name"
                  autoComplete="name"
                  placeholder="Your full name"
                  value={formData.name}
                  onChange={handleFormChange}
                  className="editorial-input"
                />
              </label>

              <label className="block">
                <span className="editorial-input-label">Email address</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleFormChange}
                  className="editorial-input"
                />
              </label>

              <label className="block">
                <span className="editorial-input-label">Phone number</span>
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+92 300 1234567"
                  value={formData.phone}
                  onChange={handleFormChange}
                  className="editorial-input"
                />
                <span className="editorial-auth-copy mt-2 block text-xs">Include country code.</span>
              </label>

              <label className="block">
                <span className="editorial-input-label">Password</span>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Minimum 8 characters"
                    value={formData.password}
                    onChange={handleFormChange}
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
                <StrengthBar score={passwordScore} />
              </label>

              <button type="submit" disabled={!isFormValid || isAccountSubmitting} className="editorial-primary-button">
                {isAccountSubmitting ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          </>
        )}
      </div>
    </EditorialSignupShell>
  );
};

export default SignupPage;
