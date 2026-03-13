const isAnswered = (question, answers) => {
  const answer = answers[question._id];

  if (!answer) {
    return false;
  }

  if (question.type === 'mcq') {
    return Boolean(answer.selectedOptionId);
  }

  return Boolean(answer.essayText?.trim());
};

const QuestionNavigator = ({ questions, currentQuestionId, answers, onSelectQuestion }) => {
  const groupedQuestions = questions.reduce((accumulator, question, index) => {
    const sectionKey = question.section?._id || `section-${index}`;
    const sectionTitle = question.section?.title || 'Section';

    accumulator[sectionKey] = accumulator[sectionKey] || {
      title: sectionTitle,
      items: [],
    };

    accumulator[sectionKey].items.push({
      question,
      index,
    });

    return accumulator;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groupedQuestions).map(([sectionKey, section]) => (
        <div key={sectionKey}>
          <div className="mb-3 inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-heading font-bold text-mutedFg">
            {section.title}
          </div>
          <div className="grid grid-cols-5 gap-2">
            {section.items.map(({ question, index }) => {
              const answered = isAnswered(question, answers);
              const isCurrent = question._id === currentQuestionId;

              return (
                <button
                  key={question._id}
                  type="button"
                  onClick={() => onSelectQuestion(index)}
                  className={`min-h-10 min-w-10 rounded-md font-heading text-sm font-bold transition-all duration-200 ease-bounce ${
                    isCurrent
                      ? 'border-2 border-foreground bg-accent text-accentFg shadow-pop-press'
                      : answered
                        ? 'border-2 border-foreground bg-quaternary text-foreground shadow-pop-press'
                        : 'border-2 border-border bg-muted text-mutedFg'
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuestionNavigator;
