const getOptionLabel = (index) => String.fromCharCode(65 + index);

const MCQQuestion = ({ question, value, onChange }) => (
  <div>
    <h2 className="mb-6 font-heading text-xl font-bold text-foreground">{question.content}</h2>
    <div className="space-y-4">
      {(question.options || []).map((option, index) => {
        const isSelected = value === option._id;

        return (
          <button
            key={option._id}
            type="button"
            onClick={() => onChange(option._id)}
            className={`flex w-full items-start gap-4 rounded-lg border-2 p-4 text-left font-body transition-all duration-200 ease-bounce ${
              isSelected
                ? 'border-accent bg-accent/10 text-foreground shadow-pop-press'
                : 'border-border bg-card hover:bg-muted'
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                isSelected
                  ? 'border-foreground bg-accent text-accentFg'
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
