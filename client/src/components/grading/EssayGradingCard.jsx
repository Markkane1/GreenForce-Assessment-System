const EssayGradingCard = ({ answer, value, onChange, onSave, isSaving = false }) => (
  <article className="rounded-2xl border border-border bg-card p-5 shadow-editorialMd">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h4 className="font-heading text-xl font-extrabold text-foreground">Essay Question</h4>
        <p className="mt-2 text-sm leading-7 text-mutedFg">{answer.questionId?.content}</p>
      </div>
      <span className="rounded-full border border-border bg-secondary px-3 py-1 font-editorialMono text-xs font-medium uppercase tracking-[0.15em] text-foreground shadow-editorialSm">
        Max {answer.questionId?.points} pts
      </span>
    </div>

    <div className="mt-5 rounded-xl border border-border bg-muted p-4 text-sm leading-7 text-foreground">
      {answer.essayText || 'No answer submitted.'}
    </div>

    <div className="mt-5 grid gap-4 md:grid-cols-[180px,1fr]">
      <label className="space-y-2">
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Score</span>
        <input
          type="number"
          min="0"
          max={answer.questionId?.points || 0}
          value={value.score}
          onChange={(event) => onChange('score', event.target.value)}
          className="editorial-input-surface"
        />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Feedback</span>
        <textarea
          rows="4"
          value={value.feedback}
          onChange={(event) => onChange('feedback', event.target.value)}
          className="editorial-input-surface"
        />
      </label>
    </div>

    <button
      type="button"
      onClick={onSave}
      disabled={isSaving}
      className="editorial-button-secondary mt-5"
    >
      {isSaving ? 'Saving Grade...' : 'Save Grade'}
    </button>
  </article>
);

export default EssayGradingCard;
