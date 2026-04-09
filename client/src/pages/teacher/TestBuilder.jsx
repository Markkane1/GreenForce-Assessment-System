import {
  ChevronDown,
  ChevronUp,
  FilePlus2,
  FileUp,
  Save,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Badge from '../../components/common/Badge';
import DashboardLayout from '../../components/common/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import * as testService from '../../services/testService';

const stripTones = ['border-accent', 'border-secondary', 'border-tertiary', 'border-quaternary'];
const DEFAULT_MCQ_OPTION_COUNT = 4;
const DEFAULT_ANTI_CHEAT_SETTINGS = {
  violationThreshold: 5,
  disableContextMenu: true,
  disableCopyPaste: true,
  disableTranslate: true,
  disableAutocomplete: true,
  disableSpellcheck: true,
  disablePrinting: true,
};

let readExcelFileModulePromise;

const loadReadExcelFile = async () => {
  if (!readExcelFileModulePromise) {
    readExcelFileModulePromise = import('read-excel-file/browser');
  }

  return readExcelFileModulePromise;
};

const buildDefaultOptions = () =>
  Array.from({ length: DEFAULT_MCQ_OPTION_COUNT }, (_, index) => ({
    text: `Option ${index + 1}`,
    isCorrect: index === 0,
  }));

const normalizeHeader = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const getRowValue = (row, keys) => {
  const normalizedEntries = Object.entries(row).reduce((accumulator, [key, value]) => {
    accumulator[normalizeHeader(key)] = value;
    return accumulator;
  }, {});

  for (const key of keys) {
    const value = normalizedEntries[normalizeHeader(key)];
    if (value !== undefined && String(value).trim() !== '') {
      return value;
    }
  }

  return '';
};

const normalizeSpreadsheetCell = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) {
      return value.richText.map((entry) => entry.text || '').join('');
    }

    if (value.text !== undefined) {
      return String(value.text);
    }

    if (value.result !== undefined) {
      return String(value.result ?? '');
    }

    if (value.hyperlink) {
      return String(value.text || value.hyperlink);
    }
  }

  return String(value);
};

const parseCsvText = (text) => {
  const rows = [];
  let currentCell = '';
  let currentRow = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1;
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentCell = '';
      currentRow = [];
      continue;
    }

    currentCell += character;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
};

const normalizeParsedCsvRows = (rows) =>
  rows.map((row) => {
    if (row.length !== 1) {
      return row;
    }

    const [singleCell] = row;
    const trimmedCell = String(singleCell ?? '').trim();

    if (!trimmedCell.includes(',')) {
      return row;
    }

    const reparsedRows = parseCsvText(trimmedCell);

    if (reparsedRows.length === 1 && reparsedRows[0].length > 1) {
      return reparsedRows[0];
    }

    return row;
  });

const tabularRowsToObjects = (rows) => {
  if (!rows.length) {
    return [];
  }

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((value) => String(value ?? '').trim());

  return dataRows
    .filter((row) => row.some((value) => String(value ?? '').trim() !== ''))
    .map((row) =>
      headers.reduce((accumulator, header, index) => {
        accumulator[header || `column${index + 1}`] = row[index] ?? '';
        return accumulator;
      }, {}));
};

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
  antiCheat: { ...DEFAULT_ANTI_CHEAT_SETTINGS },
  isPublished: false,
  sections: [],
});

const normalizeTestDraft = (draft) => ({
  ...draft,
  antiCheat: {
    ...DEFAULT_ANTI_CHEAT_SETTINGS,
    ...(draft?.antiCheat || {}),
  },
});

const hasDefaultAntiCheatSettings = (antiCheat = {}) =>
  Object.entries(DEFAULT_ANTI_CHEAT_SETTINGS).every(
    ([key, value]) => antiCheat?.[key] === value,
  );

const isEmptyAutoDraft = (test) =>
  !test?.isPublished
  && (test?.title || '').trim() === 'Untitled Test'
  && !(test?.description || '').trim()
  && Number(test?.timeLimitMinutes) === 60
  && Number(test?.passingScore) === 50
  && Number(test?.maxAttempts) === 1
  && test?.allowResume === false
  && test?.randomizeQuestions === false
  && test?.randomizeOptions === false
  && hasDefaultAntiCheatSettings(test?.antiCheat)
  && Number(test?.questionCount || 0) === 0;

const createEmptyQuestionPayload = (type) => ({
  type,
  content: type === 'essay' ? 'Write your answer here...' : 'New multiple-choice question',
  points: 1,
  maxWordCount: type === 'essay' ? 300 : null,
  options: type === 'mcq' ? buildDefaultOptions() : [],
});

const validateSectionDraft = (section) => {
  if (!section.title?.trim()) {
    return 'Section title is required.';
  }

  if (!Number.isInteger(section.questionPoolSize) || section.questionPoolSize < 0) {
    return 'Section question pool size cannot be negative.';
  }

  if (!Number.isInteger(section.questionsToServe) || section.questionsToServe < 0) {
    return 'Section questions to serve cannot be negative.';
  }

  if (section.questionsToServe > section.questionPoolSize) {
    return 'Section questions to serve cannot be greater than the question pool size.';
  }

  return '';
};

const validateQuestionDraft = (question) => {
  if (!question.content?.trim()) {
    return question.type === 'essay' ? 'Essay prompt is required.' : 'Question text is required.';
  }

  if (!Number.isFinite(question.points) || Number(question.points) < 1) {
    return 'Question points must be at least 1.';
  }

  if (question.type === 'essay') {
    if (!Number.isInteger(question.maxWordCount) || question.maxWordCount < 1) {
      return 'Essay max word count must be at least 1.';
    }

    return '';
  }

  if (!Array.isArray(question.options) || question.options.length !== DEFAULT_MCQ_OPTION_COUNT) {
    return 'MCQ questions must have exactly 4 options.';
  }

  if (question.options.some((option) => !option.text?.trim())) {
    return 'Every MCQ option must include text.';
  }

  if (!question.options.some((option) => option.isCorrect)) {
    return 'Please mark one MCQ option as correct.';
  }

  return '';
};

const Toggle = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3 shadow-editorialSm">
    <span className="font-body text-sm font-semibold text-foreground">{label}</span>
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-9 w-[4.5rem] items-center rounded-full border px-1 transition-all duration-200 ease-out ${
        checked ? 'border-accent bg-accent' : 'border-border bg-muted'
      }`}
    >
      <span
        className={`h-6 w-6 rounded-full border border-border bg-card shadow-editorialSm transition-all duration-200 ease-out ${
          checked ? 'translate-x-8' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

const QuestionEditor = ({
  question,
  questionNumber,
  totalQuestions,
  onChange,
  onSave,
  onDelete,
  onOptionChange,
  isSaving,
  isDirty,
}) => (
  <div className="rounded-[1.25rem] border border-border bg-background p-5 shadow-editorialSm">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Badge tone={question.type === 'mcq' ? 'secondary' : 'tertiary'}>{question.type}</Badge>
        <Badge tone="accent">{`${question.type.toUpperCase()} ${questionNumber} of ${totalQuestions}`}</Badge>
        {isDirty ? <Badge tone="accent">Unsaved</Badge> : null}
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={isSaving}
        className="editorial-icon-button editorial-icon-button--accent disabled:cursor-not-allowed disabled:opacity-70"
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
            className="editorial-input-surface bg-card"
          />
        ) : (
          <input
            value={question.content}
            onChange={(event) => onChange('content', event.target.value)}
            className="editorial-input-surface bg-card"
          />
        )}
      </label>

      {question.type === 'mcq' ? (
        <div className="space-y-3">
          {question.options.map((option, index) => (
            <div key={`${question._id || 'new'}-${index}`} className="grid gap-3 md:grid-cols-[1fr,110px]">
              <input
                value={option.text}
                onChange={(event) => onOptionChange(index, 'text', event.target.value)}
                className="editorial-input-surface bg-card"
              />
              <button
                type="button"
                onClick={() => onOptionChange(index, 'isCorrect', true, true)}
                disabled={isSaving}
                className={`rounded-full border px-4 py-3 font-body text-sm font-semibold transition-all duration-200 ease-out ${
                  option.isCorrect ? 'border-accent bg-accent text-white shadow-editorialSm' : 'border-border bg-muted text-foreground'
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                Correct?
              </button>
            </div>
          ))}
        </div>
      ) : (
        <label className="block space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Max Word Count</span>
          <input
            type="number"
            min="1"
            value={question.maxWordCount || ''}
            onChange={(event) => onChange('maxWordCount', Number(event.target.value))}
            className="editorial-input-surface bg-card"
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
          className="editorial-input-surface bg-card"
        />
      </label>

      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="editorial-button-secondary disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSaving ? 'Saving...' : isDirty ? 'Save Question' : 'Saved'}
      </button>
    </div>
  </div>
);

const TestBuilder = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: routeTestId } = useParams();
  const [searchParams] = useSearchParams();
  const [tests, setTests] = useState([]);
  const [currentTest, setCurrentTest] = useState(createEmptyDraft());
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [savingSectionId, setSavingSectionId] = useState(null);
  const [savingQuestionId, setSavingQuestionId] = useState(null);
  const [addingQuestionType, setAddingQuestionType] = useState(null);
  const [actingSectionId, setActingSectionId] = useState(null);
  const [dirtyQuestionIds, setDirtyQuestionIds] = useState([]);
  const draftSaveTimerRef = useRef(null);
  const sectionSaveTimersRef = useRef(new Map());
  const fileInputRefs = useRef({});
  const statusMessageTimerRef = useRef(null);

  const loadTests = useCallback(async () => {
    const testList = await testService.getTests();
    setTests(testList);
    return testList;
  }, []);

  const loadWorkspace = useCallback(async (testId) => {
    const workspace = await testService.getTestWorkspace(testId);
    setCurrentTest(normalizeTestDraft(workspace));
    setDirtyQuestionIds([]);
  }, []);

  const clearDraftAutosave = () => {
    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current);
      draftSaveTimerRef.current = null;
    }
  };

  const clearSectionAutosave = (sectionId) => {
    const timerId = sectionSaveTimersRef.current.get(sectionId);
    if (timerId) {
      clearTimeout(timerId);
      sectionSaveTimersRef.current.delete(sectionId);
    }
  };

  const showStatusMessage = (message) => {
    setStatusMessage(message);

    if (statusMessageTimerRef.current) {
      clearTimeout(statusMessageTimerRef.current);
    }

    statusMessageTimerRef.current = setTimeout(() => {
      setStatusMessage('');
      statusMessageTimerRef.current = null;
    }, 3000);
  };

  const persistDraftSnapshot = async (draft) => {
    const payload = {
      title: draft.title?.trim() || 'Untitled Test',
      description: draft.description,
      timeLimitMinutes: draft.timeLimitMinutes,
      passingScore: draft.passingScore,
      maxAttempts: draft.maxAttempts,
      allowResume: draft.allowResume,
      randomizeQuestions: draft.randomizeQuestions,
      randomizeOptions: draft.randomizeOptions,
      antiCheat: {
        ...DEFAULT_ANTI_CHEAT_SETTINGS,
        ...(draft.antiCheat || {}),
      },
    };

    const savedTest = draft._id
      ? await testService.updateTest(draft._id, payload)
      : await testService.createTest(payload);

    if (!draft._id) {
      setCurrentTest((current) => ({ ...current, _id: savedTest._id }));
      navigate(`/teacher/tests/${savedTest._id}`, { replace: true });
    }

    await loadTests();
    showStatusMessage('Changes auto-saved.');
    return savedTest;
  };

  const queueDraftAutosave = (draft) => {
    clearDraftAutosave();
    draftSaveTimerRef.current = setTimeout(async () => {
      try {
        await persistDraftSnapshot(draft);
      } catch (error) {
        setErrorMessage(error.message || 'Unable to save test settings.');
      }
    }, 600);
  };

  const queueSectionAutosave = (section, testId) => {
    if (!section?._id || !testId) {
      return;
    }

    clearSectionAutosave(section._id);

    const timerId = setTimeout(async () => {
      try {
        await saveSection(section, { silent: true, testId });
      } catch {
        // handled inside saveSection
      }
    }, 600);

    sectionSaveTimersRef.current.set(section._id, timerId);
  };

  const parseImportedQuestions = async (file) => {
    const fileName = file.name.toLowerCase();
    let rows = [];

    if (fileName.endsWith('.csv')) {
      rows = tabularRowsToObjects(normalizeParsedCsvRows(parseCsvText(await file.text())));
    } else if (fileName.endsWith('.xlsx')) {
      const readExcelFileModule = await loadReadExcelFile();
      const readXlsxFile = readExcelFileModule.default || readExcelFileModule;
      rows = tabularRowsToObjects(
        (await readXlsxFile(file)).map((row) => row.map((value) => normalizeSpreadsheetCell(value))),
      );
    } else {
      throw new Error('Please import a CSV or XLSX file.');
    }

    if (rows.length === 0) {
      throw new Error('The selected file is empty.');
    }

    return rows.map((row, index) => {
      const questionText = String(getRowValue(row, ['question', 'questionText', 'question text'])).trim();
      const option1 = String(getRowValue(row, ['option1', 'option 1', 'a', 'optiona', 'choice1', 'choice 1'])).trim();
      const option2 = String(getRowValue(row, ['option2', 'option 2', 'b', 'optionb', 'choice2', 'choice 2'])).trim();
      const option3 = String(getRowValue(row, ['option3', 'option 3', 'c', 'optionc', 'choice3', 'choice 3'])).trim();
      const option4 = String(getRowValue(row, ['option4', 'option 4', 'd', 'optiond', 'choice4', 'choice 4'])).trim();
      const correctValue = String(
        getRowValue(row, ['correctOption', 'correct option', 'correctAnswer', 'correct answer', 'answer', 'correct']) || ''
      ).trim();
      const points = Number(getRowValue(row, ['points', 'point', 'marks', 'score']) || 1);

      if (!questionText) {
        throw new Error(`Row ${index + 2}: question text is required.`);
      }

      const options = [option1, option2, option3, option4].map((text, optionIndex) => ({
        text,
        isCorrect: false,
        optionIndex,
      }));

      if (options.some((option) => !option.text)) {
        throw new Error(`Row ${index + 2}: exactly 4 option columns are required.`);
      }

      const numericCorrectIndex = Number(correctValue);
      let correctIndex = Number.isInteger(numericCorrectIndex) && numericCorrectIndex >= 1 && numericCorrectIndex <= 4
        ? numericCorrectIndex - 1
        : options.findIndex((option) => option.text.toLowerCase() === correctValue.toLowerCase());

      if (correctIndex < 0) {
        throw new Error(`Row ${index + 2}: correct option must be 1-4 or exactly match one option text.`);
      }

      return {
        content: questionText,
        points: Number.isFinite(points) && points > 0 ? points : 1,
        options: options.map((option, optionIndex) => ({
          text: option.text,
          isCorrect: optionIndex === correctIndex,
        })),
      };
    });
  };

  const searchParamTestId = searchParams.get('testId');
  const searchParamNew = searchParams.get('new');
  const searchParamFresh = searchParams.get('fresh');

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      setErrorMessage('');
      setStatusMessage('');

      try {
        const testList = await loadTests();
        const requestedTestId = routeTestId || searchParamTestId;
        const shouldCreateNew = location.pathname === '/teacher/tests/new' || (!routeTestId && searchParamNew === '1');
        const shouldStartFresh = searchParamFresh === '1';

        if (shouldCreateNew) {
          const reusableDraft = !shouldStartFresh ? testList.find((test) => isEmptyAutoDraft(test)) : null;
          if (reusableDraft?._id) {
            await loadWorkspace(reusableDraft._id);
          } else {
            setCurrentTest(createEmptyDraft());
          }
        } else if (requestedTestId) {
          await loadWorkspace(requestedTestId);
        } else if (testList.length > 0) {
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

    return () => {
      clearDraftAutosave();
      sectionSaveTimersRef.current.forEach((timerId) => clearTimeout(timerId));
      sectionSaveTimersRef.current.clear();
      if (statusMessageTimerRef.current) {
        clearTimeout(statusMessageTimerRef.current);
      }
    };
  }, [loadTests, loadWorkspace, location.pathname, routeTestId, searchParamFresh, searchParamNew, searchParamTestId]);

  const saveDraft = async () => {
    setIsSaving(true);
    setErrorMessage('');
    setStatusMessage('');
    clearDraftAutosave();

    try {
      if (!currentTest.title?.trim()) {
        throw new Error('Test title is required.');
      }

      const payload = {
        title: currentTest.title.trim(),
        description: currentTest.description,
        timeLimitMinutes: currentTest.timeLimitMinutes,
        passingScore: currentTest.passingScore,
        maxAttempts: currentTest.maxAttempts,
        allowResume: currentTest.allowResume,
        randomizeQuestions: currentTest.randomizeQuestions,
        randomizeOptions: currentTest.randomizeOptions,
        antiCheat: {
          ...DEFAULT_ANTI_CHEAT_SETTINGS,
          ...(currentTest.antiCheat || {}),
        },
      };

      const savedTest = currentTest._id
        ? await testService.updateTest(currentTest._id, payload)
        : await testService.createTest(payload);

      await loadTests();
      navigate(`/teacher/tests/${savedTest._id}`, { replace: true });
      showStatusMessage('Draft saved.');
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
    setStatusMessage('');

    try {
      const saved = currentTest._id ? null : await saveDraft();
      const testId = saved?._id || currentTest._id;
      await testService.publishTest(testId);
      await loadTests();
      navigate('/teacher/tests', { replace: true });
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
    setCurrentTest((current) => {
      const nextDraft = { ...current, [field]: value };
      setErrorMessage('');
      queueDraftAutosave(nextDraft);
      return nextDraft;
    });
  };

  const updateAntiCheatField = (field, value) => {
    setCurrentTest((current) => {
      const nextDraft = {
        ...current,
        antiCheat: {
          ...DEFAULT_ANTI_CHEAT_SETTINGS,
          ...(current.antiCheat || {}),
          [field]: value,
        },
      };
      setErrorMessage('');
      queueDraftAutosave(nextDraft);
      return nextDraft;
    });
  };

  const addSection = async () => {
    setIsSaving(true);
    setActingSectionId('new');
    try {
      setErrorMessage('');
      setStatusMessage('');
      const testId = await ensureSavedTest();
      await testService.createSection(testId, {
        title: `Section ${currentTest.sections.length + 1}`,
        order: currentTest.sections.length + 1,
        questionPoolSize: 0,
        questionsToServe: 0,
      });
      await loadWorkspace(testId);
      showStatusMessage('Section added.');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to add section.');
    } finally {
      setActingSectionId(null);
      setIsSaving(false);
    }
  };

  const discardCurrentTest = async () => {
    const isSavedDraft = Boolean(currentTest._id);
    const confirmationMessage = isSavedDraft
      ? 'Discard this test completely? This will delete the test, its sections, and its questions.'
      : 'Discard this unsaved test and start over?';

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      clearDraftAutosave();

      if (isSavedDraft) {
        await testService.deleteTest(currentTest._id);
        await loadTests();
        navigate('/teacher/tests', { replace: true });
      } else {
        setCurrentTest(createEmptyDraft());
        navigate('/teacher/tests/new?fresh=1', { replace: true });
      }
    } catch (error) {
      setErrorMessage(error.message || 'Unable to discard test.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSectionLocal = (sectionId, field, value) => {
    setCurrentTest((current) => {
      let updatedSection = null;
      const nextState = {
        ...current,
        sections: current.sections.map((section) => {
          if (section._id !== sectionId) {
            return section;
          }

          const nextValue = Number.isNaN(value) ? section[field] : value;
          updatedSection = {
            ...section,
            [field]: nextValue,
            ...(field === 'questionPoolSize' ? { questionsToServe: nextValue } : {}),
          };
          return updatedSection;
        }),
      };

      if (updatedSection) {
        setErrorMessage('');
        queueSectionAutosave(updatedSection, current._id);
      }

      return nextState;
    });
  };

  const saveSection = async (section, options = {}) => {
    const { silent = false, testId = currentTest._id } = options;
    setIsSaving(true);
    setSavingSectionId(section._id);
    setErrorMessage('');
    clearSectionAutosave(section._id);

    if (!silent) {
      setStatusMessage('');
    }

    try {
      const validationMessage = validateSectionDraft(section);

      if (validationMessage) {
        setErrorMessage(validationMessage);
        return;
      }

      await testService.updateSection(section._id, {
        title: section.title.trim(),
        order: section.order,
        questionPoolSize: section.questionPoolSize,
        questionsToServe: section.questionsToServe,
      });
      await loadWorkspace(testId);
      showStatusMessage(silent ? 'Changes auto-saved.' : `Saved ${section.title.trim()}.`);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save section.');
    } finally {
      setSavingSectionId(null);
      setIsSaving(false);
    }
  };

  const removeSection = async (sectionId) => {
    if (!window.confirm('Delete this section and all of its questions?')) {
      return;
    }

    setIsSaving(true);
    setActingSectionId(sectionId);
    setErrorMessage('');
    setStatusMessage('');
    clearSectionAutosave(sectionId);

    try {
      await testService.deleteSection(sectionId);
      setCurrentTest((current) => ({
        ...current,
        sections: current.sections.filter((section) => section._id !== sectionId),
      }));
      await loadWorkspace(currentTest._id);
      showStatusMessage('Section deleted.');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to delete section.');
    } finally {
      setActingSectionId(null);
      setIsSaving(false);
    }
  };

  const addQuestion = async (sectionId, type) => {
    setIsSaving(true);
    setActingSectionId(sectionId);
    setAddingQuestionType(type);
    setErrorMessage('');
    setStatusMessage('');

    try {
      await testService.createQuestion(sectionId, createEmptyQuestionPayload(type));
      await loadWorkspace(currentTest._id);
      showStatusMessage(type === 'essay' ? 'Essay question added.' : 'MCQ question added.');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to add question.');
    } finally {
      setActingSectionId(null);
      setAddingQuestionType(null);
      setIsSaving(false);
    }
  };

  const updateQuestionLocal = (sectionId, questionId, updater) => {
    setDirtyQuestionIds((current) => (current.includes(questionId) ? current : [...current, questionId]));
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

  const importQuestionsForSection = async (sectionId, file) => {
    setIsSaving(true);
    setActingSectionId(sectionId);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const questions = await parseImportedQuestions(file);
      await testService.importQuestions(sectionId, questions);
      await loadWorkspace(currentTest._id);
      showStatusMessage(`Imported ${questions.length} question${questions.length === 1 ? '' : 's'}.`);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to import questions.');
    } finally {
      setActingSectionId(null);
      setIsSaving(false);
      if (fileInputRefs.current[sectionId]) {
        fileInputRefs.current[sectionId].value = '';
      }
    }
  };

  const saveQuestion = async (question) => {
    setIsSaving(true);
    setSavingQuestionId(question._id);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const validationMessage = validateQuestionDraft(question);

      if (validationMessage) {
        setErrorMessage(validationMessage);
        return;
      }

      await testService.updateQuestion(question._id, {
        type: question.type,
        content: question.content.trim(),
        points: question.points,
        maxWordCount: question.type === 'essay' ? question.maxWordCount : null,
        options:
          question.type === 'mcq'
            ? question.options.map((option) => ({
                ...option,
                text: option.text.trim(),
              }))
            : undefined,
        });
        await loadWorkspace(currentTest._id);
        setDirtyQuestionIds((current) => current.filter((id) => id !== question._id));
        showStatusMessage('Question saved.');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save question.');
    } finally {
      setSavingQuestionId(null);
      setIsSaving(false);
    }
  };

  const removeQuestion = async (questionId) => {
    if (!window.confirm('Delete this question?')) {
      return;
    }

    setIsSaving(true);
    setSavingQuestionId(questionId);
    setErrorMessage('');
    setStatusMessage('');

    try {
      await testService.deleteQuestion(questionId);
      setCurrentTest((current) => ({
        ...current,
        sections: current.sections.map((section) => ({
          ...section,
          questions: (section.questions || []).filter((question) => question._id !== questionId),
        })),
      }));
      await loadWorkspace(currentTest._id);
      setDirtyQuestionIds((current) => current.filter((id) => id !== questionId));
      showStatusMessage('Question deleted.');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to delete question.');
    } finally {
      setSavingQuestionId(null);
      setIsSaving(false);
    }
  };

  const draftTests = useMemo(
    () =>
      tests.filter(
        (test) =>
          !test.isPublished && (!isEmptyAutoDraft(test) || test._id === currentTest._id),
      ),
    [currentTest._id, tests],
  );

  if (isLoading) {
    return (
      <DashboardLayout title="Test Builder">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Test Builder">
      <section className="editorial-panel p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <input
            value={currentTest.title}
            onChange={(event) => updateTestField('title', event.target.value)}
            className="w-full bg-transparent font-heading text-4xl font-semibold text-foreground outline-none placeholder:text-mutedFg"
            placeholder="Untitled Test"
          />
          <div className="grid w-full gap-3 sm:grid-cols-3 xl:w-auto xl:min-w-[420px]">
            <button
              type="button"
              onClick={discardCurrentTest}
              disabled={isSaving}
              className="editorial-button-secondary w-full justify-center"
            >
              Discard Test
            </button>
            <button
              type="button"
              onClick={saveDraft}
              disabled={isSaving}
              className="editorial-button-secondary w-full justify-center"
            >
              <Save size={18} strokeWidth={2.5} />
              Save Draft
            </button>
            <button
              type="button"
              onClick={publishCurrentTest}
              disabled={isSaving}
              className="editorial-button-primary w-full justify-center"
            >
              Publish
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-secondary bg-secondary/15 px-4 py-3 font-body text-sm font-medium text-foreground">
            {errorMessage}
          </div>
        ) : null}

        {statusMessage ? (
            <div className="mt-5 rounded-full border border-quaternary bg-quaternary/20 px-4 py-2 text-sm font-medium text-foreground">
              {statusMessage}
            </div>
        ) : null}

        {draftTests.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {draftTests.map((test) => (
              <button
                key={test._id}
                type="button"
                onClick={() => navigate(`/teacher/tests/${test._id}`)}
                className={`rounded-full border px-4 py-2 font-body text-sm font-semibold transition-all duration-200 ease-out ${
                  currentTest._id === test._id ? 'border-accent bg-accent text-white shadow-editorialSm' : 'border-border bg-muted text-foreground'
                }`}
              >
                {test.title || 'Untitled Test'} · {String(test._id).slice(-4)}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mt-8 grid gap-8 xl:grid-cols-[320px,1fr]">
        <aside className="rounded-xl border border-border bg-card p-6 shadow-editorialMd">
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
                <input type="number" min="1" value={currentTest.timeLimitMinutes} onChange={(event) => updateTestField('timeLimitMinutes', Number(event.target.value))} className="editorial-input-surface" />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Passing Marks</span>
                <input type="number" min="0" value={currentTest.passingScore} onChange={(event) => updateTestField('passingScore', Number(event.target.value))} className="editorial-input-surface" />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Max Attempts</span>
                <input type="number" min="1" value={currentTest.maxAttempts} onChange={(event) => updateTestField('maxAttempts', Number(event.target.value))} className="editorial-input-surface" />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Cheating Threshold</span>
                <input
                  type="number"
                  min="1"
                  value={currentTest.antiCheat?.violationThreshold ?? DEFAULT_ANTI_CHEAT_SETTINGS.violationThreshold}
                  onChange={(event) =>
                    updateAntiCheatField(
                      'violationThreshold',
                      Math.max(1, Number.parseInt(event.target.value || `${DEFAULT_ANTI_CHEAT_SETTINGS.violationThreshold}`, 10) || DEFAULT_ANTI_CHEAT_SETTINGS.violationThreshold),
                    )}
                  className="editorial-input-surface"
                />
                <p className="text-xs text-mutedFg">
                  Auto-submit the exam after this many recorded anti-cheat violations.
                </p>
              </label>
              <Toggle label="Allow Resume" checked={currentTest.allowResume} onChange={() => updateTestField('allowResume', !currentTest.allowResume)} />
              <Toggle label="Randomize Questions" checked={currentTest.randomizeQuestions} onChange={() => updateTestField('randomizeQuestions', !currentTest.randomizeQuestions)} />
              <Toggle label="Randomize Options" checked={currentTest.randomizeOptions} onChange={() => updateTestField('randomizeOptions', !currentTest.randomizeOptions)} />

              <div className="mt-6 border-t border-border pt-5">
                <div className="editorial-section-label mb-3">
                  <span>Anti-Cheat</span>
                </div>
                <p className="mb-4 text-sm leading-6 text-mutedFg">
                  Configure which browser restrictions are enforced during this exam.
                </p>
                <div className="space-y-3">
                  <Toggle
                    label="Disable right-click context menu"
                    checked={currentTest.antiCheat?.disableContextMenu}
                    onChange={() => updateAntiCheatField('disableContextMenu', !currentTest.antiCheat?.disableContextMenu)}
                  />
                  <Toggle
                    label="Disable copy/paste"
                    checked={currentTest.antiCheat?.disableCopyPaste}
                    onChange={() => updateAntiCheatField('disableCopyPaste', !currentTest.antiCheat?.disableCopyPaste)}
                  />
                  <Toggle
                    label="Disable translate"
                    checked={currentTest.antiCheat?.disableTranslate}
                    onChange={() => updateAntiCheatField('disableTranslate', !currentTest.antiCheat?.disableTranslate)}
                  />
                  <Toggle
                    label="Disable autocomplete"
                    checked={currentTest.antiCheat?.disableAutocomplete}
                    onChange={() => updateAntiCheatField('disableAutocomplete', !currentTest.antiCheat?.disableAutocomplete)}
                  />
                  <Toggle
                    label="Disable spellcheck"
                    checked={currentTest.antiCheat?.disableSpellcheck}
                    onChange={() => updateAntiCheatField('disableSpellcheck', !currentTest.antiCheat?.disableSpellcheck)}
                  />
                  <Toggle
                    label="Disable printing"
                    checked={currentTest.antiCheat?.disablePrinting}
                    onChange={() => updateAntiCheatField('disablePrinting', !currentTest.antiCheat?.disablePrinting)}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </aside>

        <section className="space-y-6">
          {currentTest.sections.map((section, sectionIndex) => (
            <article key={section._id} className="rounded-xl border border-border bg-card shadow-editorialMd">
              <div className={`border-l-4 ${stripTones[sectionIndex % stripTones.length]} p-5`}>
                <div className="grid gap-4 xl:grid-cols-[1fr,180px,180px,150px,56px] xl:items-end">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Section Title</span>
                    <input value={section.title} onChange={(event) => updateSectionLocal(section._id, 'title', event.target.value)} className="editorial-input-surface" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Pool Size</span>
                    <input type="number" min="0" value={section.questionPoolSize} onChange={(event) => updateSectionLocal(section._id, 'questionPoolSize', Number(event.target.value))} className="editorial-input-surface" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Serve</span>
                    <input type="number" min="0" value={section.questionsToServe} onChange={(event) => updateSectionLocal(section._id, 'questionsToServe', Number(event.target.value))} className="editorial-input-surface" />
                  </label>
                  <button type="button" onClick={() => saveSection(section)} disabled={isSaving} className="editorial-button-secondary disabled:cursor-not-allowed disabled:opacity-70">
                    {savingSectionId === section._id ? 'Saving...' : 'Save Section'}
                  </button>
                  <button type="button" onClick={() => removeSection(section._id)} disabled={isSaving} className="editorial-icon-button editorial-icon-button--accent h-12 w-12 disabled:cursor-not-allowed disabled:opacity-70">
                    <Trash2 size={16} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  {section.questions?.map((question, questionIndex) => (
                    <QuestionEditor
                      key={question._id}
                      question={question}
                      questionNumber={questionIndex + 1}
                      totalQuestions={section.questions?.length || 0}
                      isSaving={savingQuestionId === question._id}
                      isDirty={dirtyQuestionIds.includes(question._id)}
                      onChange={(field, value) => updateQuestionLocal(section._id, question._id, (current) => ({ ...current, [field]: value }))}
                      onSave={() => saveQuestion(question)}
                      onDelete={() => removeQuestion(question._id)}
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
                  <button
                    type="button"
                    onClick={() => addQuestion(section._id, 'mcq')}
                    disabled={isSaving}
                    className="editorial-button-secondary disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {actingSectionId === section._id && addingQuestionType === 'mcq' ? 'Adding MCQ...' : 'Add MCQ'}
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuestion(section._id, 'essay')}
                    disabled={isSaving}
                    className="editorial-button-secondary disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {actingSectionId === section._id && addingQuestionType === 'essay' ? 'Adding Essay...' : 'Add Essay'}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[section._id]?.click()}
                    disabled={isSaving}
                    className="editorial-pill-button border-tertiary bg-tertiary/15 text-foreground disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <FileUp size={18} strokeWidth={2.5} />
                    {actingSectionId === section._id ? 'Importing...' : 'Import CSV/XLSX'}
                  </button>
                  <input
                    ref={(element) => {
                      fileInputRefs.current[section._id] = element;
                    }}
                    type="file"
                    accept=".csv,.xlsx"
                    className="hidden"
                    onChange={(event) => {
                      const [file] = event.target.files || [];
                      if (file) {
                        importQuestionsForSection(section._id, file);
                      }
                    }}
                  />
                  <p className="w-full text-xs text-mutedFg">
                    Import columns: <span className="font-semibold">question, option1, option2, option3, option4, correctOption, points</span>
                  </p>
                </div>
              </div>
            </article>
          ))}

          <button type="button" onClick={addSection} disabled={isSaving} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border p-4 font-body text-sm font-semibold text-mutedFg transition-all duration-200 ease-out hover:border-accent hover:bg-accent/5 hover:text-accent disabled:cursor-not-allowed disabled:opacity-70">
            <FilePlus2 size={18} strokeWidth={2.5} />
            {actingSectionId === 'new' ? 'Adding Section...' : 'Add Section'}
          </button>
        </section>
      </section>
    </DashboardLayout>
  );
};

export default TestBuilder;
