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
    <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-border bg-card/95 px-4 py-4 backdrop-blur-sm sm:px-6 lg:h-20 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-0">
      <div className="min-w-0">
        <div className="editorial-section-label mb-2 max-w-sm">
          <span>Workspace</span>
        </div>
        <h1 className="break-words font-heading text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
      </div>
      <div className="flex w-full items-center gap-3 self-stretch rounded-full border border-border bg-muted/80 px-3 py-2 shadow-editorialSm sm:w-auto sm:self-auto">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card font-heading text-sm font-semibold text-foreground">
            {getInitials(user?.name)}
          </div>
          <div className="min-w-0 flex-1 text-left sm:max-w-[12rem]">
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
