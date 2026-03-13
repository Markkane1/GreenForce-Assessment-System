import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../hooks/useAuth';

const getDashboardPath = (role) => {
  if (role === 'admin') {
    return '/admin/dashboard';
  }

  if (role === 'teacher') {
    return '/teacher/dashboard';
  }

  return '/student/dashboard';
};

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-foreground bg-secondary shadow-pop">
          <Lock size={48} strokeWidth={2.5} className="text-white" />
        </div>

        <h1 className="mt-8 font-heading text-4xl font-extrabold text-foreground">Access Denied</h1>
        <p className="mt-4 font-body text-lg text-mutedFg">You don&apos;t have permission to view this page.</p>

        <div className="mt-5 flex items-center justify-center gap-2 text-sm text-foreground">
          <span>You are signed in as</span>
          <Badge tone={user?.role === 'admin' ? 'accent' : user?.role === 'teacher' ? 'secondary' : 'quaternary'}>
            {user?.role || 'guest'}
          </Badge>
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={() => navigate(user?.role ? getDashboardPath(user.role) : '/login')}
            className="inline-flex min-w-[220px] items-center justify-center rounded-full border-2 border-foreground bg-accent px-6 py-3 font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
          >
            Go to My Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
