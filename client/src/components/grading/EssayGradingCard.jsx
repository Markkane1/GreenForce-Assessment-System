const EssayGradingCard = ({ answer, value, onChange, onSave, isSaving = false }) => (
  <article className="rounded-[1.5rem] border-2 border-foreground bg-card p-5 shadow-pop-soft">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h4 className="font-heading text-xl font-extrabold text-foreground">Essay Question</h4>
        <p className="mt-2 text-sm leading-7 text-mutedFg">{answer.questionId?.content}</p>
      </div>
      <span className="rounded-full border-2 border-foreground bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-foreground shadow-pop-soft">
        Max {answer.questionId?.points} pts
      </span>
    </div>

    <div className="mt-5 rounded-xl border-2 border-border bg-muted p-4 text-sm leading-7 text-foreground">
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
          className="w-full rounded-lg border-2 border-foreground bg-background px-4 py-3 text-foreground shadow-pop-soft outline-none transition-all duration-200 ease-bounce focus:shadow-pop"
        />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Feedback</span>
        <textarea
          rows="4"
          value={value.feedback}
          onChange={(event) => onChange('feedback', event.target.value)}
          className="w-full rounded-lg border-2 border-foreground bg-background px-4 py-3 text-foreground shadow-pop-soft outline-none transition-all duration-200 ease-bounce focus:shadow-pop"
        />
      </label>
    </div>

    <button
      type="button"
      onClick={onSave}
      disabled={isSaving}
      className="mt-5 rounded-full border-2 border-foreground bg-secondary px-5 py-3 text-sm font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
    >
      {isSaving ? 'Saving Grade...' : 'Save Grade'}
    </button>
  </article>
);

export default EssayGradingCard;
