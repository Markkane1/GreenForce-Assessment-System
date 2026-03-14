import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const FloatingShapes = () => (
  <div className="pointer-events-none">
    <div className="absolute left-[8%] top-[14%] hidden h-20 w-20 -rotate-12 rounded-full border border-border bg-secondary shadow-editorialSm sm:block" />
    <svg className="absolute right-[12%] top-[16%] hidden h-24 w-24 rotate-12 sm:block" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <path d="M60 10L110 100H10L60 10Z" fill="#E9DED0" stroke="#E8E4DF" strokeWidth="2" />
    </svg>
    <svg className="absolute bottom-[18%] left-[16%] hidden h-20 w-20 -rotate-6 sm:block" viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <rect x="10" y="10" width="80" height="80" rx="16" fill="#F5F3F0" stroke="#E8E4DF" strokeWidth="2" />
    </svg>
    <div className="absolute bottom-[14%] right-[14%] hidden h-16 w-16 rotate-6 rounded-full border border-border bg-quaternary/15 shadow-editorialSm sm:block" />
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
    <div className="editorial-auth-shell relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
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
          <button type="button" onClick={handleGoHome} className="editorial-button-primary min-w-[140px]">
            Go Home
          </button>
          <button type="button" onClick={() => window.history.back()} className="editorial-button-secondary min-w-[140px]">
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
