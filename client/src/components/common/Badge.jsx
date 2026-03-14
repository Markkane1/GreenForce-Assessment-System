const toneClasses = {
  accent: 'bg-accent/10 text-accent border-accent',
  secondary: 'bg-secondary text-foreground border-border',
  tertiary: 'bg-tertiary/15 text-foreground border-tertiary',
  quaternary: 'bg-quaternary/15 text-foreground border-quaternary',
  muted: 'bg-muted text-mutedFg border-border',
  neutral: 'bg-card text-foreground border-border',
};

const Badge = ({ children, tone = 'neutral', className = '' }) => (
  <span
    className={`inline-flex items-center rounded-full border px-3 py-1 font-editorialMono text-xs font-medium uppercase tracking-[0.15em] shadow-editorialSm ${toneClasses[tone]} ${className}`}
  >
    {children}
  </span>
);

export default Badge;
