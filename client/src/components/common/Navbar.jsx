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
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border bg-card/95 px-8 backdrop-blur-sm">
      <div>
        <div className="editorial-section-label mb-2 max-w-sm">
          <span>Workspace</span>
        </div>
        <h1 className="font-heading text-3xl font-semibold text-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-3 rounded-full border border-border bg-muted/80 px-3 py-2 shadow-editorialSm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card font-heading text-sm font-semibold text-foreground">
            {getInitials(user?.name)}
          </div>
          <div className="hidden max-w-[12rem] text-left md:block">
            <p className="break-words font-heading text-base font-semibold leading-5 text-foreground">
              {user?.name || 'Exam User'}
            </p>
            <p className="font-editorialMono text-xs uppercase tracking-[0.15em] text-mutedFg">{user?.role || 'guest'}</p>
          </div>
          <ChevronDown size={16} className="text-mutedFg" />
      </div>
    </header>
  );
};

export default Navbar;
