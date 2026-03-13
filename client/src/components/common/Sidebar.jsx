import { KeyRound, LayoutDashboard, LogOut, ScrollText, ShieldCheck, Users, UsersRound } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Badge from './Badge';

const navigationByRole = {
  admin: [
    { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', to: '/admin/users', icon: Users },
    { label: 'Groups', to: '/admin/groups', icon: UsersRound },
  ],
  teacher: [
    { label: 'Dashboard', to: '/teacher/dashboard', icon: LayoutDashboard },
    { label: 'Tests', to: '/teacher/tests/new', icon: ScrollText },
    { label: 'Schedule', to: '/teacher/schedule', icon: UsersRound },
    { label: 'Grading', to: '/teacher/grade', icon: ShieldCheck },
  ],
  student: [{ label: 'Dashboard', to: '/student/dashboard', icon: LayoutDashboard }],
};

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'OT';

const Sidebar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const links = navigationByRole[user?.role] || [];

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r-2 border-border bg-card px-5 py-6">
      <div className="flex items-center gap-3 border-b-2 border-border pb-6">
        <span className="inline-flex h-8 w-8 rounded-full border-2 border-foreground bg-accent" />
        <div>
          <p className="font-heading text-2xl font-extrabold text-accent">ExamPop</p>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-mutedFg">Testing Suite</p>
        </div>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-2">
        {links.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-sm font-bold transition-all duration-200 ease-bounce ${
                  isActive
                    ? 'border-foreground bg-accent text-accentFg shadow-pop-press'
                    : 'border-transparent text-mutedFg hover:bg-muted'
                }`
              }
            >
              <Icon size={18} strokeWidth={2.5} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="rounded-[1.5rem] border-2 border-border bg-muted p-4 shadow-pop-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground bg-tertiary text-sm font-extrabold text-foreground">
            {getInitials(user?.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-heading text-base font-bold text-foreground">{user?.name || 'Exam User'}</p>
            <Badge tone="secondary" className="mt-1">
              {user?.role || 'guest'}
            </Badge>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/change-password')}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border-2 border-foreground bg-card px-4 py-3 text-sm font-bold text-foreground shadow-pop-soft transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
        >
          <KeyRound size={16} strokeWidth={2.5} />
          Change Password
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border-2 border-foreground bg-secondary px-4 py-3 text-sm font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
        >
          <LogOut size={16} strokeWidth={2.5} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
