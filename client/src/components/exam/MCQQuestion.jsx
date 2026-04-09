const getOptionLabel = (index) => String.fromCharCode(65 + index);

const MCQQuestion = ({ question, value, onChange, disableTranslate = true }) => (
  <div
    translate={disableTranslate ? 'no' : undefined}
    className={disableTranslate ? 'min-w-0 notranslate' : 'min-w-0'}
  >
    <div className="editorial-section-label mb-6">
      <span>Multiple choice</span>
    </div>
    <h2 className="mb-6 break-words font-heading text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
      {question.content}
    </h2>
    <div className="space-y-4">
      {(question.options || []).map((option, index) => {
        const isSelected = value === option._id;

        return (
          <button
            key={option._id}
            type="button"
            onClick={() => onChange(option._id)}
            className={`flex min-w-0 w-full items-start gap-3 rounded-xl border p-4 text-left font-body transition-all duration-200 ease-out sm:gap-4 sm:p-5 ${
              isSelected
                ? 'border-accent bg-accent/10 text-foreground shadow-editorialMd'
                : 'border-border bg-card hover:border-accent/40 hover:bg-muted/70'
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold sm:h-9 sm:w-9 ${
                isSelected
                  ? 'border-accent bg-accent text-accentFg'
                  : 'border-border bg-muted text-mutedFg'
              }`}
              >
              {getOptionLabel(index)}
            </span>
            <span className="min-w-0 flex-1 break-words pt-0.5 text-sm leading-6 text-foreground sm:pt-1 sm:text-base sm:leading-7">
              {option.text}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

export default MCQQuestion;
