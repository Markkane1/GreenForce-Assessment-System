const toneClasses = {
  accent: 'bg-accent text-accentFg border-foreground',
  secondary: 'bg-secondary text-foreground border-foreground',
  tertiary: 'bg-tertiary text-foreground border-foreground',
  quaternary: 'bg-quaternary text-foreground border-foreground',
  muted: 'bg-muted text-foreground border-border',
  neutral: 'bg-card text-foreground border-border',
};

const Badge = ({ children, tone = 'neutral', className = '' }) => (
  <span
    className={`inline-flex items-center rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] shadow-pop-soft ${toneClasses[tone]} ${className}`}
  >
    {children}
  </span>
);

export default Badge;
