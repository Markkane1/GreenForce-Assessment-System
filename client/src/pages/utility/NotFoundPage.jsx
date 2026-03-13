import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const FloatingShapes = () => (
  <div className="pointer-events-none">
    <div className="absolute left-[8%] top-[14%] hidden h-20 w-20 -rotate-12 rounded-full border-2 border-foreground bg-secondary shadow-pop-press sm:block" />
    <svg className="absolute right-[12%] top-[16%] hidden h-24 w-24 rotate-12 sm:block" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <path d="M60 10L110 100H10L60 10Z" fill="#A78BFA" stroke="#1E293B" strokeWidth="4" />
    </svg>
    <svg className="absolute bottom-[18%] left-[16%] hidden h-20 w-20 -rotate-6 sm:block" viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <rect x="10" y="10" width="80" height="80" rx="16" fill="#FDE68A" stroke="#1E293B" strokeWidth="4" />
    </svg>
    <div className="absolute bottom-[14%] right-[14%] hidden h-16 w-16 rotate-6 rounded-full border-2 border-foreground bg-quaternary shadow-pop-press sm:block" />
    <svg className="absolute left-[28%] top-[28%] hidden h-14 w-14 rotate-[18deg] sm:block" viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <rect x="18" y="18" width="64" height="64" rx="12" fill="#F9A8D4" stroke="#1E293B" strokeWidth="4" />
    </svg>
  </div>
);

const getDashboardPath = (role) => {
  if (role === 'admin') {
    return '/admin/dashboard';
  }

  if (role === 'teacher') {
    return '/teacher/dashboard';
  }

  return '/student/dashboard';
};

const NotFoundPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoHome = () => {
    navigate(user?.role ? getDashboardPath(user.role) : '/login');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
      <FloatingShapes />

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <h1
          className="font-heading text-[8rem] font-extrabold leading-none text-accent drop-shadow-[4px_4px_0px_#1E293B]"
        >
          404
        </h1>
        <h2 className="mt-4 font-heading text-2xl font-bold text-foreground">Oops! Page not found</h2>
        <p className="mt-4 font-body text-lg text-mutedFg">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            type="button"
            onClick={handleGoHome}
            className="inline-flex min-w-[140px] items-center justify-center rounded-full border-2 border-foreground bg-accent px-6 py-3 font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
          >
            Go Home
          </button>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex min-w-[140px] items-center justify-center rounded-full border-2 border-foreground bg-secondary px-6 py-3 font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
