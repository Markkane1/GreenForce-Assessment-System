import { KeyRound, LayoutDashboard, LogOut, ScrollText, ShieldCheck, Users, UsersRound } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Badge from './Badge';

const navigationByRole = {
  admin: [
    { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', to: '/admin/users', icon: Users },
    { label: 'Groups', to: '/admin/groups', icon: UsersRound },
    { label: 'Teaching', to: '/teacher/dashboard', icon: LayoutDashboard },
    { label: 'Tests', to: '/teacher/tests', icon: ScrollText },
    { label: 'Schedule', to: '/teacher/schedule', icon: UsersRound },
    { label: 'Grading', to: '/teacher/grade', icon: ShieldCheck },
  ],
  teacher: [
    { label: 'Dashboard', to: '/teacher/dashboard', icon: LayoutDashboard },
    { label: 'Tests', to: '/teacher/tests', icon: ScrollText },
    { label: 'Schedule', to: '/teacher/schedule', icon: UsersRound },
    { label: 'Grading', to: '/teacher/grade', icon: ShieldCheck },
  ],
  student: [
    { label: 'Dashboard', to: '/student/dashboard', icon: LayoutDashboard },
    { label: 'My Results', to: '/student/results', icon: ScrollText },
  ],
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
    <aside className="z-40 flex w-full flex-col border-b border-border bg-card/95 px-4 py-4 backdrop-blur-sm sm:px-6 lg:fixed lg:inset-y-0 lg:left-0 lg:h-screen lg:w-72 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
      <div className="border-b border-border pb-4 lg:pb-6">
        <div className="editorial-section-label mb-5">
          <span>Navigation</span>
        </div>
        <div className="flex items-center gap-4">
          <img
            src="/environmental-protection-force-circular.svg"
            alt="Environmental Protection Force logo"
            className="h-12 w-12 shrink-0 rounded-full border border-border bg-card object-cover shadow-editorialSm"
          />
          <div className="min-w-0">
            <p className="font-heading text-[1.25rem] font-semibold leading-tight text-foreground">EPA Punjab</p>
            <p className="mt-1 max-w-[10rem] font-editorialMono text-[0.65rem] font-medium uppercase leading-4 tracking-[0.13em] text-accent">
              Testing System
            </p>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-20 -mx-4 mt-4 border-y border-border bg-card/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:static lg:m-0 lg:border-y-0 lg:bg-transparent lg:px-0 lg:py-0">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-card/95 to-transparent lg:hidden" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-card/95 to-transparent lg:hidden" />
          <nav className="flex gap-2 overflow-x-auto pb-1 pr-4 scrollbar-none lg:mt-8 lg:flex-1 lg:flex-col lg:overflow-visible lg:pb-6 lg:pr-0">
            {links.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex shrink-0 items-center gap-3 rounded-xl border px-4 py-3 font-body text-sm font-semibold transition-all duration-200 ease-out lg:shrink ${
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
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-muted/80 p-4 shadow-editorialMd lg:mt-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start lg:flex-col">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card font-heading text-sm font-semibold text-foreground">
              {getInitials(user?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 break-words font-heading text-lg font-semibold leading-6 text-foreground">
                {user?.name || 'Exam User'}
              </p>
              <Badge tone="secondary" className="mt-1">
                {user?.role || 'guest'}
              </Badge>
            </div>
          </div>
          <div className="grid gap-3 sm:flex-1 sm:grid-cols-2 lg:grid-cols-1">
            <button
              type="button"
              onClick={() => navigate('/change-password')}
              className="editorial-button-secondary w-full"
            >
              <KeyRound size={16} strokeWidth={2.5} />
              Change Password
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="editorial-button-primary w-full"
            >
              <LogOut size={16} strokeWidth={2.5} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
