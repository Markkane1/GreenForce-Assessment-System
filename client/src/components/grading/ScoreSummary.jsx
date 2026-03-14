import Badge from '../common/Badge';

const ScoreSummary = ({ score = 0, passingScore = 0, passed = null }) => {
  const ratio = passingScore > 0 ? Math.min((score / passingScore) * 100, 100) : 0;
  const statusTone = passed ? 'quaternary' : 'accent';

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-editorialMd">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-editorialMono text-xs font-medium uppercase tracking-[0.15em] text-mutedFg">Final Score</p>
          <p className="mt-2 font-heading text-3xl font-semibold text-foreground">{score}</p>
          <p className="mt-1 text-sm text-mutedFg">Passing score: {passingScore}</p>
        </div>
        <Badge tone={statusTone}>{passed ? 'Pass' : 'Review'}</Badge>
      </div>
      <div className="mt-5 h-4 overflow-hidden rounded-full border border-border bg-muted">
        <div className="h-full bg-accent transition-all duration-300 ease-bounce" style={{ width: `${ratio}%` }} />
      </div>
    </div>
  );
};

export default ScoreSummary;
