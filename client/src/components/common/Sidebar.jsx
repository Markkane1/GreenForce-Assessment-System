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
    <aside className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-card/95 px-6 py-8 backdrop-blur-sm">
      <div className="border-b border-border pb-6">
        <div className="editorial-section-label mb-5">
          <span>Navigation</span>
        </div>
        <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 rounded-full border border-accent bg-accent/10" />
        <div>
          <p className="font-heading text-3xl font-semibold text-foreground">ExamPop</p>
          <p className="font-editorialMono text-xs font-medium uppercase tracking-[0.15em] text-accent">Testing Suite</p>
        </div>
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
                `flex items-center gap-3 rounded-xl border px-4 py-3 font-body text-sm font-semibold transition-all duration-200 ease-out ${
                  isActive
                    ? 'border-accent bg-accent/10 text-accent shadow-editorialMd'
                    : 'border-transparent text-mutedFg hover:border-border hover:bg-muted/70 hover:text-foreground'
                }`
              }
            >
              <Icon size={18} strokeWidth={2.5} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="rounded-2xl border border-border bg-muted/80 p-4 shadow-editorialMd">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card font-heading text-sm font-semibold text-foreground">
            {getInitials(user?.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-heading text-lg font-semibold text-foreground">{user?.name || 'Exam User'}</p>
            <Badge tone="secondary" className="mt-1">
              {user?.role || 'guest'}
            </Badge>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/change-password')}
          className="editorial-button-secondary mt-4 w-full"
        >
          <KeyRound size={16} strokeWidth={2.5} />
          Change Password
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="editorial-button-primary mt-3 w-full"
        >
          <LogOut size={16} strokeWidth={2.5} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
