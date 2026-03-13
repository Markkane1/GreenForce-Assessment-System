const getWordCount = (text = '') =>
  text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;

const EssayQuestion = ({ question, value, onChange, errorMessage = '' }) => {
  const currentWordCount = getWordCount(value);
  const warningRatio = question.maxWordCount ? currentWordCount / question.maxWordCount : 0;
  const isWarning = warningRatio >= 0.85;
  const isExceeded = Boolean(question.maxWordCount) && currentWordCount > question.maxWordCount;

  return (
    <div>
      <h2 className="font-heading text-xl font-bold text-foreground">{question.content}</h2>
      <div className="relative mt-6">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-[200px] w-full resize-y rounded-xl border-2 border-foreground bg-background px-4 py-4 text-foreground shadow-pop-soft outline-none transition-all duration-200 ease-bounce focus:shadow-pop"
          placeholder="Write your answer here..."
        />
        <span
          className={`absolute bottom-3 right-3 rounded-full px-2 py-0.5 text-xs font-medium ${
            isExceeded
              ? 'bg-red-500 text-white'
              : isWarning
                ? 'bg-secondary text-foreground'
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
