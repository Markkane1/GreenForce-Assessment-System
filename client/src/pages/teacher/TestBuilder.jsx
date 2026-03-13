import {
  ChevronDown,
  ChevronUp,
  FilePlus2,
  Save,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Badge from '../../components/common/Badge';
import DashboardLayout from '../../components/common/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import * as testService from '../../services/testService';

const stripTones = ['border-accent', 'border-secondary', 'border-tertiary', 'border-quaternary'];

const createEmptyDraft = () => ({
  _id: null,
  title: 'Untitled Test',
  description: '',
  timeLimitMinutes: 60,
  passingScore: 50,
  maxAttempts: 1,
  allowResume: false,
  randomizeQuestions: false,
  randomizeOptions: false,
  isPublished: false,
  sections: [],
});

const createEmptyQuestionPayload = (type) => ({
  type,
  content: '',
  points: 1,
  maxWordCount: type === 'essay' ? 300 : null,
  options:
    type === 'mcq'
      ? [
          { text: 'Option 1', isCorrect: true },
          { text: 'Option 2', isCorrect: false },
        ]
      : [],
});

const Toggle = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between gap-3 rounded-full border-2 border-foreground bg-background px-4 py-3 shadow-pop-soft">
    <span className="text-sm font-bold text-foreground">{label}</span>
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-10 w-20 items-center rounded-full border-2 border-foreground px-1 transition-all duration-200 ease-bounce ${
        checked ? 'bg-accent' : 'bg-muted'
      }`}
    >
      <span
        className={`h-7 w-7 rounded-full border-2 border-foreground bg-card shadow-pop-press transition-all duration-200 ease-bounce ${
          checked ? 'translate-x-9' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

const QuestionEditor = ({ question, onChange, onSave, onDelete, onAddOption, onRemoveOption, onOptionChange, isSaving }) => (
  <div className="rounded-[1.25rem] border-2 border-border bg-background p-4 shadow-pop-soft">
    <div className="flex items-center justify-between gap-3">
      <Badge tone={question.type === 'mcq' ? 'secondary' : 'tertiary'}>{question.type}</Badge>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground bg-accent text-accentFg shadow-pop-press"
      >
        <Trash2 size={16} strokeWidth={2.5} />
      </button>
    </div>

    <div className="mt-4 space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">
          {question.type === 'mcq' ? 'Question Text' : 'Prompt'}
        </span>
        {question.type === 'essay' ? (
          <textarea
            rows="4"
            value={question.content}
            onChange={(event) => onChange('content', event.target.value)}
            className="w-full rounded-lg border-2 border-foreground bg-card px-4 py-3 text-foreground shadow-pop-soft outline-none focus:shadow-pop"
          />
        ) : (
          <input
            value={question.content}
            onChange={(event) => onChange('content', event.target.value)}
            className="w-full rounded-lg border-2 border-foreground bg-card px-4 py-3 text-foreground shadow-pop-soft outline-none focus:shadow-pop"
          />
        )}
      </label>

      {question.type === 'mcq' ? (
        <div className="space-y-3">
          {question.options.map((option, index) => (
            <div key={`${question._id || 'new'}-${index}`} className="grid gap-3 md:grid-cols-[1fr,110px,48px]">
              <input
                value={option.text}
                onChange={(event) => onOptionChange(index, 'text', event.target.value)}
                className="w-full rounded-lg border-2 border-foreground bg-card px-4 py-3 text-foreground shadow-pop-soft outline-none focus:shadow-pop"
              />
              <button
                type="button"
                onClick={() => onOptionChange(index, 'isCorrect', true, true)}
                className={`rounded-full border-2 px-4 py-3 text-sm font-bold ${
                  option.isCorrect ? 'border-foreground bg-accent text-accentFg shadow-pop' : 'border-border bg-muted text-foreground'
                }`}
              >
                Correct?
              </button>
              <button
                type="button"
                onClick={() => onRemoveOption(index)}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground bg-secondary text-foreground shadow-pop-press"
                disabled={question.options.length <= 2}
              >
                <Trash2 size={16} strokeWidth={2.5} />
              </button>
            </div>
          ))}
          {question.options.length < 6 ? (
            <button type="button" onClick={onAddOption} className="text-sm font-bold text-accent underline decoration-2 underline-offset-4">
              Add Option
            </button>
          ) : null}
        </div>
      ) : (
        <label className="block space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Max Word Count</span>
          <input
            type="number"
            min="1"
            value={question.maxWordCount || ''}
            onChange={(event) => onChange('maxWordCount', Number(event.target.value))}
            className="w-full rounded-lg border-2 border-foreground bg-card px-4 py-3 text-foreground shadow-pop-soft outline-none focus:shadow-pop"
          />
        </label>
      )}

      <label className="block space-y-2">
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Points</span>
        <input
          type="number"
          min="1"
          value={question.points}
          onChange={(event) => onChange('points', Number(event.target.value))}
          className="w-full rounded-lg border-2 border-foreground bg-card px-4 py-3 text-foreground shadow-pop-soft outline-none focus:shadow-pop"
        />
      </label>

      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="rounded-full border-2 border-foreground bg-secondary px-5 py-3 text-sm font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
      >
        {isSaving ? 'Saving...' : 'Save Question'}
      </button>
    </div>
  </div>
);

const TestBuilder = () => {
  const navigate = useNavigate();
  const { id: routeTestId } = useParams();
  const [searchParams] = useSearchParams();
  const [tests, setTests] = useState([]);
  const [currentTest, setCurrentTest] = useState(createEmptyDraft());
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadTests = async () => {
    const testList = await testService.getTests();
    setTests(testList);
    return testList;
  };

  const loadWorkspace = async (testId) => {
    const workspace = await testService.getTestWorkspace(testId);
    setCurrentTest(workspace);
  };

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const testList = await loadTests();
        const requestedTestId = routeTestId || searchParams.get('testId');
        const shouldCreateNew = !routeTestId && searchParams.get('new') === '1';

        if (requestedTestId) {
          await loadWorkspace(requestedTestId);
        } else if (!shouldCreateNew && testList.length > 0) {
          await loadWorkspace(testList[0]._id);
        } else {
          setCurrentTest(createEmptyDraft());
        }
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load test builder.');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [routeTestId, searchParams]);

  const saveDraft = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      const payload = {
        title: currentTest.title,
        description: currentTest.description,
        timeLimitMinutes: currentTest.timeLimitMinutes,
        passingScore: currentTest.passingScore,
        maxAttempts: currentTest.maxAttempts,
        allowResume: currentTest.allowResume,
        randomizeQuestions: currentTest.randomizeQuestions,
        randomizeOptions: currentTest.randomizeOptions,
      };

      const savedTest = currentTest._id
        ? await testService.updateTest(currentTest._id, payload)
        : await testService.createTest(payload);

      await loadTests();
      navigate(`/teacher/tests/${savedTest._id}`, { replace: true });
      return savedTest;
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save draft.');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const publishCurrentTest = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      const saved = currentTest._id ? null : await saveDraft();
      const testId = saved?._id || currentTest._id;
      await testService.publishTest(testId);
      await loadWorkspace(testId);
      await loadTests();
    } catch (error) {
      setErrorMessage(error.message || 'Unable to publish test.');
    } finally {
      setIsSaving(false);
    }
  };

  const ensureSavedTest = async () => {
    if (currentTest._id) {
      return currentTest._id;
    }

    const saved = await saveDraft();
    return saved._id;
  };

  const updateTestField = (field, value) => {
    setCurrentTest((current) => ({ ...current, [field]: value }));
  };

  const addSection = async () => {
    try {
      const testId = await ensureSavedTest();
      await testService.createSection(testId, {
        title: `Section ${currentTest.sections.length + 1}`,
        order: currentTest.sections.length + 1,
        questionPoolSize: 5,
        questionsToServe: 5,
      });
      await loadWorkspace(testId);
    } catch {
      // error handled upstream
    }
  };

  const updateSectionLocal = (sectionId, field, value) => {
    setCurrentTest((current) => ({
      ...current,
      sections: current.sections.map((section) => (section._id === sectionId ? { ...section, [field]: value } : section)),
    }));
  };

  const saveSection = async (section) => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      await testService.updateSection(section._id, {
        title: section.title,
        order: section.order,
        questionPoolSize: section.questionPoolSize,
        questionsToServe: section.questionsToServe,
      });
      await loadWorkspace(currentTest._id);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save section.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeSection = async (sectionId) => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      await testService.deleteSection(sectionId);
      await loadWorkspace(currentTest._id);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to delete section.');
    } finally {
      setIsSaving(false);
    }
  };

  const addQuestion = async (sectionId, type) => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      await testService.createQuestion(sectionId, createEmptyQuestionPayload(type));
      await loadWorkspace(currentTest._id);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to add question.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateQuestionLocal = (sectionId, questionId, updater) => {
    setCurrentTest((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section._id !== sectionId
          ? section
          : {
              ...section,
              questions: section.questions.map((question) =>
                question._id === questionId ? updater(question) : question,
              ),
            },
      ),
    }));
  };

  const saveQuestion = async (question) => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      await testService.updateQuestion(question._id, {
        type: question.type,
        content: question.content,
        points: question.points,
        maxWordCount: question.type === 'essay' ? question.maxWordCount : null,
        options: question.type === 'mcq' ? question.options : undefined,
      });
      await loadWorkspace(currentTest._id);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save question.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeQuestion = async (questionId) => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      await testService.deleteQuestion(questionId);
      await loadWorkspace(currentTest._id);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to delete question.');
    } finally {
      setIsSaving(false);
    }
  };

  const draftTests = useMemo(() => tests.filter((test) => !test.isPublished), [tests]);

  if (isLoading) {
    return (
      <DashboardLayout title="Test Builder">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Test Builder">
      <section className="rounded-[2rem] border-2 border-border bg-card p-6 shadow-pop-soft">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <input
            value={currentTest.title}
            onChange={(event) => updateTestField('title', event.target.value)}
            className="w-full bg-transparent font-heading text-4xl font-extrabold text-foreground outline-none placeholder:text-mutedFg"
            placeholder="Untitled Test"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveDraft}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-secondary px-6 py-3 font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
            >
              <Save size={18} strokeWidth={2.5} />
              Save Draft
            </button>
            <button
              type="button"
              onClick={publishCurrentTest}
              disabled={isSaving}
              className="rounded-full border-2 border-foreground bg-accent px-6 py-3 font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
            >
              Publish
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
            {errorMessage}
          </div>
        ) : null}

        {draftTests.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {draftTests.map((test) => (
              <button
                key={test._id}
                type="button"
                onClick={() => navigate(`/teacher/tests/${test._id}`)}
                className={`rounded-full border-2 px-4 py-2 text-sm font-bold ${
                  currentTest._id === test._id ? 'border-foreground bg-accent text-accentFg shadow-pop-press' : 'border-border bg-muted text-foreground'
                }`}
              >
                {test.title}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mt-8 grid gap-8 xl:grid-cols-[320px,1fr]">
        <aside className="rounded-xl border-2 border-border bg-card p-6 shadow-pop-soft">
          <button
            type="button"
            onClick={() => setIsSettingsOpen((current) => !current)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <h3 className="font-heading text-2xl font-extrabold text-foreground">Test Settings</h3>
              <p className="mt-1 text-sm text-mutedFg">Control timing, passing rules, and randomization.</p>
            </div>
            {isSettingsOpen ? <ChevronUp size={20} strokeWidth={2.5} /> : <ChevronDown size={20} strokeWidth={2.5} />}
          </button>

          {isSettingsOpen ? (
            <div className="mt-6 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Time Limit (mins)</span>
                <input type="number" min="1" value={currentTest.timeLimitMinutes} onChange={(event) => updateTestField('timeLimitMinutes', Number(event.target.value))} className="w-full rounded-lg border-2 border-foreground bg-background px-4 py-3 text-foreground shadow-pop-soft outline-none" />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Passing Score</span>
                <input type="number" min="0" value={currentTest.passingScore} onChange={(event) => updateTestField('passingScore', Number(event.target.value))} className="w-full rounded-lg border-2 border-foreground bg-background px-4 py-3 text-foreground shadow-pop-soft outline-none" />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Max Attempts</span>
                <input type="number" min="1" value={currentTest.maxAttempts} onChange={(event) => updateTestField('maxAttempts', Number(event.target.value))} className="w-full rounded-lg border-2 border-foreground bg-background px-4 py-3 text-foreground shadow-pop-soft outline-none" />
              </label>
              <Toggle label="Allow Resume" checked={currentTest.allowResume} onChange={() => updateTestField('allowResume', !currentTest.allowResume)} />
              <Toggle label="Randomize Questions" checked={currentTest.randomizeQuestions} onChange={() => updateTestField('randomizeQuestions', !currentTest.randomizeQuestions)} />
              <Toggle label="Randomize Options" checked={currentTest.randomizeOptions} onChange={() => updateTestField('randomizeOptions', !currentTest.randomizeOptions)} />
            </div>
          ) : null}
        </aside>

        <section className="space-y-6">
          {currentTest.sections.map((section, sectionIndex) => (
            <article key={section._id} className="rounded-xl border-2 border-foreground bg-card shadow-pop-soft">
              <div className={`border-l-4 ${stripTones[sectionIndex % stripTones.length]} p-5`}>
                <div className="grid gap-4 xl:grid-cols-[1fr,180px,180px,150px,56px] xl:items-end">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Section Title</span>
                    <input value={section.title} onChange={(event) => updateSectionLocal(section._id, 'title', event.target.value)} className="w-full rounded-lg border-2 border-foreground bg-background px-4 py-3 text-foreground shadow-pop-soft outline-none" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Pool Size</span>
                    <input type="number" min="1" value={section.questionPoolSize} onChange={(event) => updateSectionLocal(section._id, 'questionPoolSize', Number(event.target.value))} className="w-full rounded-lg border-2 border-foreground bg-background px-4 py-3 text-foreground shadow-pop-soft outline-none" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Serve</span>
                    <input type="number" min="1" value={section.questionsToServe} onChange={(event) => updateSectionLocal(section._id, 'questionsToServe', Number(event.target.value))} className="w-full rounded-lg border-2 border-foreground bg-background px-4 py-3 text-foreground shadow-pop-soft outline-none" />
                  </label>
                  <button type="button" onClick={() => saveSection(section)} className="rounded-full border-2 border-foreground bg-secondary px-4 py-3 text-sm font-bold text-foreground shadow-pop-press">
                    Save Section
                  </button>
                  <button type="button" onClick={() => removeSection(section._id)} className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground bg-accent text-accentFg shadow-pop-press">
                    <Trash2 size={16} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  {section.questions?.map((question) => (
                    <QuestionEditor
                      key={question._id}
                      question={question}
                      isSaving={isSaving}
                      onChange={(field, value) => updateQuestionLocal(section._id, question._id, (current) => ({ ...current, [field]: value }))}
                      onSave={() => saveQuestion(question)}
                      onDelete={() => removeQuestion(question._id)}
                      onAddOption={() =>
                        updateQuestionLocal(section._id, question._id, (current) => ({
                          ...current,
                          options: [...current.options, { text: `Option ${current.options.length + 1}`, isCorrect: false }],
                        }))
                      }
                      onRemoveOption={(optionIndex) =>
                        updateQuestionLocal(section._id, question._id, (current) => ({
                          ...current,
                          options: current.options.filter((_, index) => index !== optionIndex),
                        }))
                      }
                      onOptionChange={(optionIndex, field, value, exclusive = false) =>
                        updateQuestionLocal(section._id, question._id, (current) => ({
                          ...current,
                          options: current.options.map((option, index) => {
                            if (exclusive) {
                              return { ...option, isCorrect: index === optionIndex };
                            }

                            return index === optionIndex ? { ...option, [field]: value } : option;
                          }),
                        }))
                      }
                    />
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" onClick={() => addQuestion(section._id, 'mcq')} className="rounded-full border-2 border-foreground bg-secondary px-5 py-3 text-sm font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press">
                    Add MCQ
                  </button>
                  <button type="button" onClick={() => addQuestion(section._id, 'essay')} className="rounded-full border-2 border-foreground bg-secondary px-5 py-3 text-sm font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press">
                    Add Essay
                  </button>
                </div>
              </div>
            </article>
          ))}

          <button type="button" onClick={addSection} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-4 font-bold text-mutedFg transition-all duration-200 ease-bounce hover:border-accent hover:bg-accent/5 hover:text-accent">
            <FilePlus2 size={18} strokeWidth={2.5} />
            Add Section
          </button>
        </section>
      </section>
    </DashboardLayout>
  );
};

export default TestBuilder;
