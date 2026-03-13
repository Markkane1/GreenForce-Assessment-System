import { ChevronDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'OT';

const Navbar = ({ title }) => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b-2 border-border bg-card px-8">
      <h1 className="font-heading text-2xl font-bold text-foreground">{title}</h1>
      <div className="flex items-center gap-3 rounded-full border-2 border-border bg-muted px-3 py-2 shadow-pop-soft">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground bg-tertiary text-sm font-extrabold text-foreground">
          {getInitials(user?.name)}
        </div>
        <div className="hidden text-left md:block">
          <p className="font-bold text-foreground">{user?.name || 'Exam User'}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-mutedFg">{user?.role || 'guest'}</p>
        </div>
        <ChevronDown size={16} className="text-mutedFg" />
      </div>
    </header>
  );
};

export default Navbar;
