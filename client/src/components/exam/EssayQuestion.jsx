const getWordCount = (text = '') =>
  text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;

const EssayQuestion = ({ question, value, onChange, errorMessage = '' }) => {
  const currentWordCount = getWordCount(value);
  const warningRatio = question.maxWordCount ? currentWordCount / question.maxWordCount : 0;
  const isWarning = warningRatio >= 0.85;
  const isExceeded = Boolean(question.maxWordCount) && currentWordCount > question.maxWordCount;

  return (
    <div>
      <div className="editorial-section-label mb-6">
        <span>Essay response</span>
      </div>
      <h2 className="font-heading text-3xl font-semibold text-foreground">{question.content}</h2>
      <div className="relative mt-6">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-[220px] w-full resize-y rounded-xl border border-border bg-background px-4 py-4 text-foreground shadow-editorialSm outline-none transition-all duration-200 ease-out focus:border-accent focus:shadow-editorialMd"
          placeholder="Write your answer here..."
        />
        <span
          className={`absolute bottom-3 right-3 rounded-full px-3 py-1 font-body text-xs font-medium ${
            isExceeded
              ? 'bg-red-500 text-white'
              : isWarning
                ? 'bg-tertiary/20 text-foreground'
                : 'bg-muted text-mutedFg'
          }`}
        >
          {currentWordCount}/{question.maxWordCount || 'Infinity'} words
        </span>
      </div>
      {errorMessage ? (
        <p className="mt-3 rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
};

export default EssayQuestion;
