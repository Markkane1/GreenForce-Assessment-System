const getOptionLabel = (index) => String.fromCharCode(65 + index);

const MCQQuestion = ({ question, value, onChange }) => (
  <div>
    <div className="editorial-section-label mb-6">
      <span>Multiple choice</span>
    </div>
    <h2 className="mb-6 font-heading text-3xl font-semibold text-foreground">{question.content}</h2>
    <div className="space-y-4">
      {(question.options || []).map((option, index) => {
        const isSelected = value === option._id;

        return (
          <button
            key={option._id}
            type="button"
            onClick={() => onChange(option._id)}
            className={`flex w-full items-start gap-4 rounded-xl border p-5 text-left font-body transition-all duration-200 ease-out ${
              isSelected
                ? 'border-accent bg-accent/10 text-foreground shadow-editorialMd'
                : 'border-border bg-card hover:border-accent/40 hover:bg-muted/70'
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                isSelected
                  ? 'border-accent bg-accent text-accentFg'
                  : 'border-border bg-muted text-mutedFg'
              }`}
            >
              {getOptionLabel(index)}
            </span>
            <span className="pt-1 text-base text-foreground">{option.text}</span>
          </button>
        );
      })}
    </div>
  </div>
);

export default MCQQuestion;
