import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle,
  CloudUpload,
  CircleHelp,
  Clipboard,
  Clock,
  LayoutList,
  EyeOff,
  Maximize,
  Minimize2,
  RotateCcw,
  SkipForward,
  Target,
  WifiOff,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import CountdownTimer from '../../components/exam/CountdownTimer';
import EssayQuestion from '../../components/exam/EssayQuestion';
import MCQQuestion from '../../components/exam/MCQQuestion';
import QuestionNavigator from '../../components/exam/QuestionNavigator';
import SubmitConfirmModal from '../../components/exam/SubmitConfirmModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import useAntiCheat from '../../hooks/useAntiCheat';
import useAutosave, { mergeDraftAnswers } from '../../hooks/useAutosave';
import useExamTimer from '../../hooks/useExamTimer';
import useFullscreen from '../../hooks/useFullscreen';
import * as examService from '../../services/examService';

const LAST_RESULT_KEY = 'last_exam_result_attempt';
const RESULT_REDIRECT_SECONDS = 5;
const EXPIRING_SCREEN_MIN_MS = 1500;
const getActiveAttemptKey = (scheduleId) => `active_exam_attempt_${scheduleId}`;
const DEFAULT_ANTI_CHEAT_SETTINGS = {
  violationThreshold: 5,
  disableContextMenu: true,
  disableCopyPaste: true,
  disableTranslate: true,
  disableAutocomplete: true,
  disableSpellcheck: true,
  disablePrinting: true,
};

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const getWordCount = (text = '') =>
  text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;

const createAnswerMap = (questions) =>
  questions.reduce((accumulator, question) => {
    accumulator[question._id] = {
      selectedOptionId: question.answer?.selectedOptionId || '',
      essayText: question.answer?.essayText || '',
    };

    return accumulator;
  }, {});

const hasAnswerValue = (question, answer) => {
  if (!question || !answer) {
    return false;
  }

  if (question.type === 'mcq') {
    return Boolean(answer.selectedOptionId);
  }

  return Boolean(answer.essayText?.trim());
};

const formatSavedTime = (date) => {
  if (!date) {
    return 'Not saved yet';
  }

  return `Saved ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const formatMmSs = (seconds = 0) => {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');

  return `${minutes}:${remainder}`;
};

const buildSections = (questions) => {
  const sections = [];

  questions.forEach((question, index) => {
    const key = question.section?._id || `section-${index}`;
    const title = question.section?.title || 'Section';
    const existing = sections[sections.length - 1];

    if (!existing || existing.key !== key) {
      sections.push({
        key,
        title,
        startIndex: index,
        endIndex: index,
        items: [{ question, index }],
      });
      return;
    }

    existing.items.push({ question, index });
    existing.endIndex = index;
  });

  return sections;
};

const getResolvedQuestionPayload = async (attemptId, initialQuestions = []) => {
  const normalizedQuestions = Array.isArray(initialQuestions) ? initialQuestions : [];

  if (normalizedQuestions.length > 0 || !attemptId) {
    return {
      attempt: null,
      questions: normalizedQuestions,
    };
  }

  const questionPayload = await examService.getQuestions(attemptId);

  return {
    attempt: questionPayload.attempt || null,
    questions: Array.isArray(questionPayload.questions) ? questionPayload.questions : [],
  };
};

const getSectionIndexForQuestion = (sections, questionIndex) =>
  sections.findIndex((section) => questionIndex >= section.startIndex && questionIndex <= section.endIndex);

const getViolationContent = (violation, isMobile) => {
  if (!violation) {
    return null;
  }

  const { eventType, metadata = {} } = violation;

  if (eventType === 'fullscreen_exit') {
    return {
      Icon: Minimize2,
      heading: 'Fullscreen Exited',
      body: 'You left fullscreen mode. This has been recorded.',
    };
  }

  if (eventType === 'copy_attempt') {
    return {
      Icon: Clipboard,
      heading: 'Copy Detected',
      body: 'Copying exam content is not allowed. This has been recorded.',
    };
  }

  if (eventType === 'window_blur' && metadata.trigger === 'blur' && !isMobile) {
    return {
      Icon: EyeOff,
      heading: 'Focus Lost',
      body: 'You switched away from this window. This has been recorded.',
    };
  }

  if (eventType === 'tab_switch') {
    return {
      Icon: EyeOff,
      heading: 'Focus Lost',
      body: isMobile
        ? 'You switched away from this exam. This has been recorded.'
        : metadata.trigger === 'visibilitychange'
          ? 'You left this exam tab. This has been recorded.'
          : 'You switched away from this exam. This has been recorded.',
    };
  }

  return {
    Icon: EyeOff,
    heading: 'Focus Lost',
    body: 'You switched away from this exam. This has been recorded.',
  };
};

const submissionContentMap = {
  timeout: {
    Icon: Clock,
    heading: 'Exam Submitted',
    body: 'Time expired. Your answers have been saved and submitted.',
    tone: 'bg-tertiary',
  },
  manual: {
    Icon: CheckCircle,
    heading: 'Exam Submitted!',
    body: 'Your answers have been submitted successfully.',
    tone: 'bg-quaternary',
  },
  force: {
    Icon: AlertTriangle,
    heading: 'Exam Auto-Submitted',
    body: 'Your exam was automatically submitted due to repeated violations.',
    tone: 'bg-secondary',
  },
};

const INACTIVE_ATTEMPT_MESSAGES = [
  'Exam attempt is not active.',
  'Exam time has expired.',
  'Exam window has closed',
  'Exam already submitted',
];

const isInactiveAttemptError = (error) =>
  error?.statusCode === 409
  && INACTIVE_ATTEMPT_MESSAGES.some((message) => error.message?.includes(message));

const getSubmissionReasonFromStatus = (status) => {
  if (status === 'force_submitted') {
    return 'force';
  }

  if (status === 'expired') {
    return 'timeout';
  }

  return 'manual';
};

const ExamPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: scheduleId } = useParams();
  const prevFullscreenRef = useRef(false);
  const inactiveAttemptResolutionRef = useRef(false);

  const [examPhase, setExamPhase] = useState('confirm');
  const [schedulePreview, setSchedulePreview] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [showSectionTransition, setShowSectionTransition] = useState(false);
  const [nextSectionInfo, setNextSectionInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isMobileNavigatorOpen, setIsMobileNavigatorOpen] = useState(false);
  const [systemMessage, setSystemMessage] = useState(location.state?.message || '');
  const [resumeBanner, setResumeBanner] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(null);
  const [hasBeenFullscreen, setHasBeenFullscreen] = useState(false);
  const [fullscreenViolationCount, setFullscreenViolationCount] = useState(0);
  const [pendingViolationAlert, setPendingViolationAlert] = useState(null);
  const [violationAlert, setViolationAlert] = useState(null);
  const [violationDismissSeconds, setViolationDismissSeconds] = useState(8);
  const [violationThreshold, setViolationThreshold] = useState(5);
  const [submissionReason, setSubmissionReason] = useState(null);
  const [redirectCountdown, setRedirectCountdown] = useState(RESULT_REDIRECT_SECONDS);
  const [isAttemptInactive, setIsAttemptInactive] = useState(false);
  const { enter, exit, isFullscreen, isSupported, isMobile: fullscreenIsMobile } = useFullscreen();

  const sections = useMemo(() => buildSections(questions), [questions]);
  const currentSectionInfo = sections[currentSectionIndex] || null;
  const currentQuestion = questions[currentIndex] || null;
  const currentAnswer = currentQuestion ? answers[currentQuestion._id] : null;
  const antiCheatSettings = useMemo(
    () => ({
      ...DEFAULT_ANTI_CHEAT_SETTINGS,
      ...(attempt?.testId?.antiCheat || schedulePreview?.testId?.antiCheat || {}),
    }),
    [attempt?.testId?.antiCheat, schedulePreview?.testId?.antiCheat],
  );

  const isCurrentEssayTooLong = useMemo(() => {
    if (currentQuestion?.type !== 'essay' || !currentQuestion.maxWordCount) {
      return false;
    }

    return getWordCount(currentAnswer?.essayText || '') > currentQuestion.maxWordCount;
  }, [currentAnswer?.essayText, currentQuestion]);

  const currentEssayErrorMessage = isCurrentEssayTooLong
    ? `Essay answers cannot exceed ${currentQuestion?.maxWordCount} words.`
    : '';

  const currentSectionAnsweredCount = useMemo(() => {
    if (!currentSectionInfo) {
      return 0;
    }

    return currentSectionInfo.items.filter(({ question }) => hasAnswerValue(question, answers[question._id])).length;
  }, [answers, currentSectionInfo]);

  const currentSectionSkippedCount = useMemo(() => {
    if (!currentSectionInfo) {
      return 0;
    }

    return Math.max(currentSectionInfo.items.length - currentSectionAnsweredCount, 0);
  }, [currentSectionAnsweredCount, currentSectionInfo]);

  const unansweredCount = useMemo(
    () => questions.filter((question) => !hasAnswerValue(question, answers[question._id])).length,
    [answers, questions],
  );
  const prevButtonDisabled = currentIndex === 0 || isCurrentEssayTooLong;
  const nextButtonDisabled = isCurrentEssayTooLong;
  const nextButtonLabel = currentSectionInfo && currentIndex === currentSectionInfo.endIndex
    ? currentSectionIndex === sections.length - 1
      ? 'Review & Submit'
      : 'Next'
    : currentIndex === questions.length - 1
      ? 'Review & Submit'
      : 'Next';

  const showFullscreenGate =
    examPhase === 'active'
    && !isFullscreen
    && !hasBeenFullscreen
    && !(fullscreenIsMobile && !isSupported);
  const showFullscreenRecovery = examPhase === 'active' && !isFullscreen && hasBeenFullscreen;
  const submissionContent = submissionReason ? submissionContentMap[submissionReason] : null;

  const {
    lastSaved,
    isSaving,
    saveStatus,
    failCount,
    queueAnswer,
    retrySave,
    flushPendingAnswers,
    clearDraftAnswers,
    setSaveStatus,
  } = useAutosave({
    attemptId: attempt?._id,
    enabled: Boolean(
      attempt?._id
      && attempt.status === 'in_progress'
      && ['active', 'expiring'].includes(examPhase)
      && !isAttemptInactive
    ),
    onError: (error) => {
      if (isInactiveAttemptError(error)) {
        void resolveInactiveAttemptState(error);
        return;
      }

      setErrorMessage(error.message || 'Unable to save your answers.');
    },
    intervalMs: 60000,
  });

  const handleQuestionChange = useCallback(
    (value) => {
      if (!currentQuestion) {
        return;
      }

      const nextAnswer = currentQuestion.type === 'mcq'
        ? {
            selectedOptionId: value,
            essayText: '',
          }
        : {
            selectedOptionId: '',
            essayText: value,
          };

      setAnswers((currentAnswers) => ({
        ...currentAnswers,
        [currentQuestion._id]: nextAnswer,
      }));

      const isWithinEssayLimit = !(
        currentQuestion.type === 'essay'
        && currentQuestion.maxWordCount
        && getWordCount(nextAnswer.essayText || '') > currentQuestion.maxWordCount
      );

      if (isWithinEssayLimit) {
        queueAnswer(currentQuestion._id, nextAnswer);
      }

      setErrorMessage('');
    },
    [currentQuestion, queueAnswer],
  );

  const finalizeSubmissionState = useCallback(
    async (reason, nextAttempt = null) => {
      const resolvedAttempt = nextAttempt || attempt;

      if (!resolvedAttempt?._id) {
        return;
      }

      setAttempt(resolvedAttempt);
      setIsSubmitting(false);
      setIsSubmitModalOpen(false);
      setShowSectionTransition(false);
      setViolationAlert(null);
      setPendingViolationAlert(null);
      setSystemMessage('');
      setExamPhase('submitted');
      setSubmissionReason(reason);
      setRedirectCountdown(RESULT_REDIRECT_SECONDS);
      setIsAttemptInactive(true);
      clearDraftAnswers(resolvedAttempt._id);
      sessionStorage.removeItem(getActiveAttemptKey(scheduleId));
      sessionStorage.setItem(LAST_RESULT_KEY, resolvedAttempt._id);
      await exit().catch(() => {});
    },
    [attempt, clearDraftAnswers, exit, scheduleId],
  );

  const resolveInactiveAttemptState = useCallback(
    async (sourceError = null) => {
      if (!attempt?._id || inactiveAttemptResolutionRef.current) {
        return;
      }

      inactiveAttemptResolutionRef.current = true;
      setIsAttemptInactive(true);

      try {
        const nextAttempt = await examService.getAttemptStatus(attempt._id);
        setAttempt(nextAttempt);

        if (['submitted', 'force_submitted', 'expired'].includes(nextAttempt.status)) {
          await finalizeSubmissionState(getSubmissionReasonFromStatus(nextAttempt.status), nextAttempt);
          return;
        }

        setIsAttemptInactive(false);
        setErrorMessage(sourceError?.message || 'The exam state changed. Please try again.');
      } catch {
        setErrorMessage(sourceError?.message || 'Your exam is no longer active.');
        sessionStorage.removeItem(getActiveAttemptKey(scheduleId));
      } finally {
        inactiveAttemptResolutionRef.current = false;
      }
    },
    [attempt?._id, finalizeSubmissionState, scheduleId],
  );

  const handleForceSubmit = useCallback(async () => {
    if (!attempt?._id) {
      return;
    }

    setExamPhase('expiring');
    setIsSubmitting(true);
    await wait(1200);
    await finalizeSubmissionState('force', {
      ...attempt,
      status: 'force_submitted',
      submittedAt: attempt.submittedAt || new Date().toISOString(),
    });
  }, [attempt, finalizeSubmissionState]);

  const handleTimerExpire = useCallback(async () => {
    if (!attempt?._id || examPhase !== 'active') {
      return;
    }

    setExamPhase('expiring');
    setIsSubmitting(true);

    try {
      await flushPendingAnswers().catch(() => {});

      const [submission] = await Promise.allSettled([
        examService.submitExam(attempt._id),
        wait(EXPIRING_SCREEN_MIN_MS),
      ]);

      if (submission.status === 'fulfilled') {
        await finalizeSubmissionState('timeout', submission.value);
        return;
      }
    } catch {
      // no-op
    }

    await finalizeSubmissionState('timeout');
  }, [attempt?._id, examPhase, finalizeSubmissionState, flushPendingAnswers]);

  const { secondsLeft, formattedTime } = useExamTimer(timerSeconds, handleTimerExpire);

  const savedStatusLabel = lastSaved
    ? `Saved ${lastSaved.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : 'Saved';
  const showNetworkLossBanner = failCount >= 2;

  const { isMobile } = useAntiCheat({
    attemptId: examPhase === 'active' ? attempt?._id : null,
    enabled: examPhase === 'active' && Boolean(attempt?._id),
    restrictions: antiCheatSettings,
    onViolation: (eventType, violationsCount, forceSubmitted, metadata) => {
      setAttempt((currentAttempt) =>
        currentAttempt && typeof violationsCount === 'number'
          ? { ...currentAttempt, violationsCount }
          : currentAttempt,
      );

      if (forceSubmitted) {
        return;
      }

      setViolationAlert({
        eventType,
        violationsCount: typeof violationsCount === 'number' ? violationsCount : null,
        forceSubmitted: false,
        metadata,
      });
    },
    onForceSubmit: handleForceSubmit,
  });

  const violationContent = getViolationContent(violationAlert, isMobile);
  const hasServerViolationCount = typeof violationAlert?.violationsCount === 'number';
  const isNearThreshold =
    hasServerViolationCount && violationAlert.violationsCount === violationThreshold - 1;
  const shouldShowViolationOverlay = Boolean(
    violationAlert
      && !(showFullscreenRecovery && ['fullscreen_exit', 'window_blur'].includes(violationAlert.eventType)),
  );

  useEffect(() => {
    const loadSchedulePreview = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const storedAttemptId = sessionStorage.getItem(getActiveAttemptKey(scheduleId));



        if (storedAttemptId) {
          try {
            const storedAttempt = await examService.getAttemptStatus(storedAttemptId);

            if (['submitted', 'force_submitted', 'expired'].includes(storedAttempt.status)) {

              sessionStorage.removeItem(getActiveAttemptKey(scheduleId));
              sessionStorage.setItem(LAST_RESULT_KEY, storedAttempt._id);
              navigate(`/student/results/${storedAttempt._id}`, {
                replace: true,
                state: { alreadySubmitted: true },
              });
              return;
            }
          } catch {
            sessionStorage.removeItem(getActiveAttemptKey(scheduleId));
          }
        }

        const preview = await examService.getSchedulePreview(scheduleId);
        setSchedulePreview(preview);
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load the exam preview.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSchedulePreview();
  }, [navigate, scheduleId]);

  useEffect(() => {
    if (examPhase === 'active' && isFullscreen) {
      setHasBeenFullscreen(true);
    }
  }, [examPhase, isFullscreen]);

  useEffect(() => {
    if (examPhase !== 'active' || !attempt?._id) {
      prevFullscreenRef.current = isFullscreen;
      return;
    }

    if (prevFullscreenRef.current && !isFullscreen) {
      const logFullscreenViolation = async () => {
        try {
          const response = await examService.logViolation(attempt._id, 'fullscreen_exit', {});

          if (response.forceSubmitted) {
            await handleForceSubmit();
            return;
          }

          const nextCount = response.violationsCount ?? 0;
          setAttempt((currentAttempt) =>
            currentAttempt ? { ...currentAttempt, violationsCount: nextCount } : currentAttempt,
          );
          setFullscreenViolationCount(nextCount);
          setPendingViolationAlert({
            eventType: 'fullscreen_exit',
            violationsCount: nextCount,
            forceSubmitted: false,
            metadata: { trigger: 'fullscreenchange' },
          });
        } catch {
          setPendingViolationAlert({
            eventType: 'fullscreen_exit',
            violationsCount: null,
            forceSubmitted: false,
            metadata: { trigger: 'fullscreenchange' },
          });
        }
      };

      logFullscreenViolation();
    }

    prevFullscreenRef.current = isFullscreen;
  }, [attempt, examPhase, fullscreenViolationCount, handleForceSubmit, isFullscreen]);

  useEffect(() => {
    if (isFullscreen && pendingViolationAlert) {
      setViolationAlert(pendingViolationAlert);
      setPendingViolationAlert(null);
    }
  }, [isFullscreen, pendingViolationAlert]);

  useEffect(() => {
    if (!sections.length || showSectionTransition) {
      return;
    }

    const sectionIndex = getSectionIndexForQuestion(sections, currentIndex);

    if (sectionIndex >= 0 && sectionIndex !== currentSectionIndex) {
      setCurrentSectionIndex(sectionIndex);
    }
  }, [currentIndex, currentSectionIndex, sections, showSectionTransition]);

  useEffect(() => {
    if (!violationAlert) {
      setViolationDismissSeconds(8);
      return undefined;
    }

    setViolationDismissSeconds(8);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      setViolationDismissSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          setViolationAlert(null);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [violationAlert]);

  useEffect(() => {
    if (saveStatus !== 'saved') {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveStatus('idle');
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [saveStatus, setSaveStatus]);

  useEffect(() => {
    if (!resumeBanner) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setResumeBanner('');
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [resumeBanner]);

  useEffect(() => {
    if (!systemMessage || systemMessage === location.state?.message) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSystemMessage('');
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [location.state?.message, systemMessage]);

  useEffect(() => {
    const handleOffline = () => {
      setSaveStatus('error');
    };

    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('offline', handleOffline);
    };
  }, [setSaveStatus]);

  useEffect(() => {
    const shouldApplyExamGuards = ['confirm', 'active', 'expiring', 'submitted'].includes(examPhase);

    if (!shouldApplyExamGuards) {
      return undefined;
    }

    const { documentElement, body } = document;
    const previousHtmlTranslate = documentElement.getAttribute('translate');
    const previousBodyTranslate = body.getAttribute('translate');

    if (antiCheatSettings.disableTranslate) {
      documentElement.setAttribute('translate', 'no');
      body.setAttribute('translate', 'no');
      documentElement.classList.add('notranslate');
      body.classList.add('notranslate');
    }

    if (antiCheatSettings.disablePrinting) {
      documentElement.classList.add('exam-print-locked');
    }

    return () => {
      if (antiCheatSettings.disableTranslate) {
        if (previousHtmlTranslate === null) {
          documentElement.removeAttribute('translate');
        } else {
          documentElement.setAttribute('translate', previousHtmlTranslate);
        }

        if (previousBodyTranslate === null) {
          body.removeAttribute('translate');
        } else {
          body.setAttribute('translate', previousBodyTranslate);
        }

        documentElement.classList.remove('notranslate');
        body.classList.remove('notranslate');
      }

      if (antiCheatSettings.disablePrinting) {
        documentElement.classList.remove('exam-print-locked');
      }
    };
  }, [antiCheatSettings.disablePrinting, antiCheatSettings.disableTranslate, examPhase]);

  useEffect(() => {
    if (examPhase !== 'submitted' || !attempt?._id) {
      return undefined;
    }

    setRedirectCountdown(RESULT_REDIRECT_SECONDS);

    const intervalId = window.setInterval(() => {
      setRedirectCountdown((current) => Math.max(current - 1, 0));
    }, 1000);

    const timeoutId = window.setTimeout(() => {
      navigate(`/student/results/${attempt._id}`, { replace: true });
    }, RESULT_REDIRECT_SECONDS * 1000);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [attempt?._id, examPhase, navigate]);

  const handleBeginExam = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await examService.startExam(scheduleId);

      if (response.alreadySubmitted || response.attempt.status !== 'in_progress') {
        sessionStorage.removeItem(getActiveAttemptKey(scheduleId));
        sessionStorage.setItem(LAST_RESULT_KEY, response.attempt._id);
        navigate(`/student/results/${response.attempt._id}`, {
          replace: true,
          state: { alreadySubmitted: true },
        });
        return;
      }

      const questionPayload = await getResolvedQuestionPayload(response.attempt?._id, response.questions);
      const nextAttempt = questionPayload.attempt || response.attempt;
      const nextQuestions = questionPayload.questions;

      if (nextQuestions.length === 0) {
        throw new Error('No questions are available for this exam attempt.');
      }

      const nextSections = buildSections(nextQuestions);
      const mergedAnswers = mergeDraftAnswers(
        nextAttempt._id,
        createAnswerMap(nextQuestions),
        nextQuestions.map((question) => question._id),
      );

      setAttempt(nextAttempt);
      setQuestions(nextQuestions);
      setAnswers(mergedAnswers);
      setViolationThreshold(response.violationThreshold ?? 5);
      setCurrentIndex(0);
      setCurrentSectionIndex(0);
      setShowSectionTransition(false);
      setNextSectionInfo(null);
      setSubmissionReason(null);
      setRedirectCountdown(RESULT_REDIRECT_SECONDS);
      setIsAttemptInactive(false);
      setIsMobileNavigatorOpen(false);
      setTimerSeconds(response.resumed ? response.remainingSeconds : nextAttempt.remainingTimeSeconds);
      setResumeBanner(response.resumed ? `Resuming your exam — ${formatMmSs(response.remainingSeconds)} remaining` : '');
      setHasBeenFullscreen(false);
      setFullscreenViolationCount(nextAttempt.violationsCount || 0);
      setViolationAlert(null);
      setPendingViolationAlert(null);
      prevFullscreenRef.current = false;
      sessionStorage.setItem(getActiveAttemptKey(scheduleId), nextAttempt._id);

      if (nextSections.length > 0) {
        setCurrentSectionIndex(0);
      }

      await enter().catch(() => {});
      setExamPhase('active');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to start the exam.');
    } finally {
      setIsLoading(false);
    }
  };

  const moveToQuestion = async (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= questions.length) {
      return;
    }

    try {
      await flushPendingAnswers();
      setShowSectionTransition(false);
      setNextSectionInfo(null);
      setIsMobileNavigatorOpen(false);
      setCurrentIndex(nextIndex);
    } catch (error) {
      if (isInactiveAttemptError(error)) {
        await resolveInactiveAttemptState(error);
        return;
      }

      setErrorMessage(error.message || 'Unable to save your answers.');
    }
  };

  const handleNext = async () => {
    try {
      await flushPendingAnswers();

      if (currentSectionInfo && currentIndex === currentSectionInfo.endIndex) {
        const upcomingSection = sections[currentSectionIndex + 1];

        if (upcomingSection) {
          setSystemMessage(`Section complete. Continuing to ${upcomingSection.title}.`);
          setShowSectionTransition(false);
          setNextSectionInfo(null);
          setCurrentSectionIndex(currentSectionIndex + 1);
          setCurrentIndex(upcomingSection.startIndex);
          return;
        }

        setIsSubmitModalOpen(true);
        return;
      }

      if (currentIndex === questions.length - 1) {
        setIsSubmitModalOpen(true);
        return;
      }

      setCurrentIndex(currentIndex + 1);
    } catch (error) {
      if (isInactiveAttemptError(error)) {
        await resolveInactiveAttemptState(error);
        return;
      }

      setErrorMessage(error.message || 'Unable to save your answers.');
    }
  };

  const handleContinueToNextSection = () => {
    if (!nextSectionInfo) {
      return;
    }

    const nextSection = sections[nextSectionInfo.sectionIndex];

    setShowSectionTransition(false);
    setCurrentSectionIndex(nextSectionInfo.sectionIndex);
    setCurrentIndex(nextSection?.startIndex ?? currentIndex);
    setNextSectionInfo(null);
    setIsMobileNavigatorOpen(false);
  };

  const handleManualSubmit = async () => {
    if (!attempt?._id) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setExamPhase('expiring');

    try {
      await flushPendingAnswers();
      const [submittedAttempt] = await Promise.all([
        examService.submitExam(attempt._id),
        wait(EXPIRING_SCREEN_MIN_MS),
      ]);
      await finalizeSubmissionState('manual', submittedAttempt);
    } catch (error) {
      if (isInactiveAttemptError(error)) {
        await resolveInactiveAttemptState(error);
        return;
      }

      setErrorMessage(error.message || 'Unable to submit the exam.');
      setIsSubmitting(false);
      setExamPhase('active');
    }
  };

  const handleViewResultsNow = () => {
    if (!attempt?._id) {
      return;
    }

    navigate(`/student/results/${attempt._id}`, { replace: true });
  };

  const handleRetrySave = async () => {
    try {
      await retrySave();
    } catch (error) {
      if (isInactiveAttemptError(error)) {
        await resolveInactiveAttemptState(error);
      }
    }
  };

  if (isLoading && examPhase === 'confirm') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (errorMessage && !attempt && examPhase === 'confirm' && !schedulePreview) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background p-6">
        <div className="editorial-panel max-w-xl p-10 text-center">
          <h2 className="font-heading text-3xl font-extrabold text-foreground">Exam unavailable</h2>
          <p className="mt-4 font-body text-mutedFg">{errorMessage}</p>
          <button
            type="button"
            onClick={() => navigate('/student/dashboard')}
            className="editorial-button-secondary mt-8"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (examPhase === 'confirm') {
    const attemptsTaken = schedulePreview?.attemptsTaken || 0;
    const maxAttempts = schedulePreview?.testId?.maxAttempts || 0;
    const remainingAttempts = Math.max(maxAttempts - attemptsTaken, 0);
    const hasAttemptsLeft = attemptsTaken < maxAttempts;

    return (
      <div
        className={`relative min-h-screen overflow-y-auto bg-background px-6 py-10 ${antiCheatSettings.disableTranslate ? 'notranslate' : ''}`}
        translate={antiCheatSettings.disableTranslate ? 'no' : undefined}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(184,134,11,0.08),transparent_40%)]" aria-hidden="true" />

        <div className="relative z-10 mx-auto w-full max-w-3xl animate-pop-in">
          <div className="mb-6 flex items-center gap-4">
            <span className="h-px flex-1 bg-border" />
            <span className="font-editorialMono text-xs font-medium uppercase tracking-[0.15em] text-accent">
              Exam Preview
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="editorial-panel p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-accent shadow-sm">
            <BookOpen size={32} strokeWidth={2.5} className="text-white" />
          </div>

          <h1 className="mt-6 font-heading text-4xl font-semibold tracking-[-0.02em] text-foreground">
            {schedulePreview?.testId?.title || 'Exam Preview'}
          </h1>
          <p className="mt-3 max-w-2xl font-body text-base text-mutedFg">
            Available until {schedulePreview?.endTime ? new Date(schedulePreview.endTime).toLocaleString() : '--'}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              {
                label: 'Time Limit',
                value: `${schedulePreview?.testId?.timeLimitMinutes || 0} minutes`,
                icon: Clock,
                tone: 'bg-accent',
              },
              {
                label: 'Questions',
                value: `${schedulePreview?.totalQuestions || 0} questions`,
                icon: CircleHelp,
                tone: 'bg-secondary',
              },
              {
                label: 'Passing Marks',
                value: `${schedulePreview?.testId?.passingScore || 0}`,
                icon: Target,
                tone: 'bg-tertiary',
              },
              {
                label: 'Attempts',
                value: `${attemptsTaken} of ${maxAttempts} used`,
                icon: RotateCcw,
                tone: 'bg-quaternary',
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="rounded-2xl border border-border bg-muted p-5 shadow-sm">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full border border-border ${item.tone} shadow-sm`}>
                    <Icon size={18} strokeWidth={2.5} className="text-white" />
                  </div>
                  <p className="mt-4 font-editorialMono text-xs font-medium uppercase tracking-[0.15em] text-mutedFg">{item.label}</p>
                  <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{item.value}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-10">
            <div className="mb-6 flex items-center gap-4">
              <span className="h-px flex-1 bg-border" />
              <span className="font-editorialMono text-xs font-medium uppercase tracking-[0.15em] text-accent">
                Before You Begin
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="mt-4 space-y-3">
              {[
                'This exam must be taken in fullscreen mode',
                'Leaving fullscreen will be logged as a violation',
                'Switching tabs or windows will be logged as a violation',
                `You have ${schedulePreview?.testId?.timeLimitMinutes || 0} minutes once you start — the timer cannot be paused`,
                schedulePreview?.testId?.allowResume
                  ? 'If you lose connection, you can resume this exam'
                  : 'This exam cannot be paused or resumed once started',
              ].map((rule) => (
                <div key={rule} className="flex items-start gap-4 rounded-2xl border border-border bg-muted/60 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-quaternary shadow-sm">
                    <Check size={14} strokeWidth={2.5} className="text-white" />
                  </div>
                  <p className="font-body text-sm leading-7 text-foreground">{rule}</p>
                </div>
              ))}
            </div>
          </div>

          {attemptsTaken > 0 && attemptsTaken < maxAttempts ? (
            <div className="mt-8 rounded-2xl border border-tertiary bg-tertiary/15 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} strokeWidth={2.5} className="mt-0.5 text-foreground" />
                <p className="font-body text-sm leading-7 text-foreground">
                  You have used {attemptsTaken} of {maxAttempts} attempts. You have {remainingAttempts} attempt(s) left.
                </p>
              </div>
            </div>
          ) : null}

          {!hasAttemptsLeft ? (
            <div className="mt-8 rounded-2xl border border-secondary bg-secondary/15 p-4 font-body text-sm font-medium text-foreground">
              You have used all attempts for this exam.
            </div>
          ) : null}

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="editorial-button-secondary flex-1 justify-center"
            >
              Back
            </button>

            {hasAttemptsLeft ? (
              <button
                type="button"
                onClick={handleBeginExam}
                disabled={isLoading}
                className="editorial-button-primary flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {isLoading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-accentFg/40 border-t-accentFg" />
                  ) : null}
                  {isLoading ? 'Starting...' : 'Begin Exam'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/student/dashboard')}
                className="editorial-button-secondary flex-1 justify-center"
              >
                Back to Dashboard
              </button>
            )}
          </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && examPhase === 'active') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (examPhase === 'expiring') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-6">
        <div className="editorial-panel w-full max-w-sm p-10 text-center animate-pop-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-secondary shadow-sm">
            <Clock size={40} strokeWidth={2.5} className="text-white" />
          </div>
          <h2 className="mt-6 font-heading text-3xl font-semibold text-foreground">Time&apos;s Up!</h2>
          <p className="mt-3 font-body text-mutedFg">Your time has expired. We&apos;re submitting your answers now...</p>
          <div className="mt-6 flex items-center justify-center gap-1.5">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (examPhase === 'submitted' && submissionContent) {
    const SubmissionIcon = submissionContent.Icon;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-6">
        <div className="editorial-panel w-full max-w-md p-10 text-center animate-pop-in">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border ${submissionContent.tone} shadow-sm`}>
            <SubmissionIcon size={40} strokeWidth={2.5} className="text-white" />
          </div>
          <h2 className="mt-6 font-heading text-3xl font-semibold text-foreground">{submissionContent.heading}</h2>
          <p className="mt-3 font-body text-mutedFg">{submissionContent.body}</p>
          <p className="mt-5 font-editorialMono text-xs uppercase tracking-[0.15em] text-mutedFg">
            Redirecting to your results in {redirectCountdown} seconds...
          </p>
          <button
            type="button"
            onClick={handleViewResultsNow}
            className="editorial-button-primary mt-8"
          >
            View Results Now
          </button>
        </div>
      </div>
    );
  }

  if (errorMessage && !attempt) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background p-6">
        <div className="editorial-panel max-w-xl p-10 text-center">
          <h2 className="font-heading text-3xl font-extrabold text-foreground">Exam unavailable</h2>
          <p className="mt-4 font-body text-mutedFg">{errorMessage}</p>
          <button
            type="button"
            onClick={() => navigate('/student/dashboard')}
            className="editorial-button-secondary mt-8"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 flex flex-col overflow-x-hidden bg-background ${antiCheatSettings.disableTranslate ? 'notranslate' : ''}`}
      translate={antiCheatSettings.disableTranslate ? 'no' : undefined}
    >
      <header className="sticky top-0 z-20 flex flex-col gap-4 border-b border-border bg-card/95 px-4 py-4 backdrop-blur sm:px-6 lg:h-20 lg:flex-row lg:items-center lg:justify-between lg:px-6 lg:py-0">
        <div className="min-w-0">
          <p className="truncate font-heading text-xl font-semibold text-foreground sm:text-2xl">
            {currentSectionInfo?.title || currentQuestion?.section?.title || 'Exam Section'}
          </p>
          <p className="font-editorialMono text-[11px] font-medium uppercase tracking-[0.15em] text-accent sm:text-xs">
            Question {Math.min(currentIndex + 1, questions.length)} of {questions.length}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto lg:justify-end">
          {saveStatus === 'saving' ? (
            <div className="inline-flex items-center gap-2 font-body text-xs text-mutedFg">
              <CloudUpload size={16} strokeWidth={2.5} className="animate-pulse" />
              <span>Saving...</span>
            </div>
          ) : null}
          {saveStatus === 'saved' ? (
            <div className="inline-flex items-center gap-2 font-body text-xs text-mutedFg">
              <Check size={16} strokeWidth={2.5} className="text-quaternary" />
              <span>{savedStatusLabel}</span>
            </div>
          ) : null}
          {saveStatus === 'error' ? (
            <div className="inline-flex items-center gap-2 font-body text-xs font-medium text-secondary">
              <WifiOff size={16} strokeWidth={2.5} />
              <span>Not saved</span>
            </div>
          ) : null}
          <CountdownTimer secondsLeft={secondsLeft} formattedTime={formattedTime} />
          <button
            type="button"
            disabled={isCurrentEssayTooLong || showSectionTransition || examPhase !== 'active'}
            onClick={() => setIsSubmitModalOpen(true)}
            className={`min-h-[44px] flex-1 rounded-md border px-4 py-2.5 font-body text-sm font-semibold tracking-[0.04em] transition-all duration-200 ease-out sm:flex-none sm:px-5 ${
              isCurrentEssayTooLong || showSectionTransition || examPhase !== 'active'
                ? 'border-border bg-muted text-mutedFg'
                : 'border-foreground bg-transparent text-foreground hover:border-accent hover:bg-muted hover:text-accent'
            }`}
          >
            Submit
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 flex-col overflow-hidden lg:flex-row">
        <aside className="hidden border-t border-border bg-card px-4 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6 lg:order-none lg:block lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-t-0 lg:px-5 lg:py-6">
          <QuestionNavigator
            questions={questions}
            currentQuestionId={currentQuestion?._id}
            answers={answers}
            onSelectQuestion={moveToQuestion}
          />
          <div className="mt-8 rounded-2xl border border-border bg-muted/60 p-5 shadow-sm">
            <p className="font-editorialMono text-xs font-medium uppercase tracking-[0.15em] text-accent">Session</p>
            <p className="mt-3 font-body text-sm text-mutedFg">{isSaving ? 'Saving...' : formatSavedTime(lastSaved)}</p>
            {systemMessage ? <p className="mt-3 font-body text-sm leading-7 text-foreground">{systemMessage}</p> : null}
          </div>
        </aside>

        <main
          className={`order-1 min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:order-none lg:px-8 lg:py-10 ${
            showNetworkLossBanner
              ? 'pb-[calc(11rem+env(safe-area-inset-bottom))] sm:pb-24'
              : 'pb-[calc(7rem+env(safe-area-inset-bottom))] sm:pb-6'
          }`}
        >
          <div className="mx-auto max-w-[800px]">
            {errorMessage ? (
              <div className="mb-6 rounded-2xl border border-secondary bg-secondary/15 px-5 py-3 font-body text-sm font-medium text-foreground">
                {errorMessage}
              </div>
            ) : null}
            {resumeBanner ? (
              <div className="mb-6 inline-flex max-w-full flex-wrap items-center gap-3 rounded-2xl border border-tertiary bg-tertiary/15 px-4 py-2 font-body text-sm font-semibold text-foreground shadow-sm">
                <RotateCcw size={16} strokeWidth={2.5} />
                {resumeBanner}
              </div>
            ) : null}

            <div className="mb-6 lg:hidden">
              <div className="editorial-panel overflow-hidden p-4">
                <button
                  type="button"
                  onClick={() => setIsMobileNavigatorOpen((current) => !current)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-muted/70 px-4 py-3 text-left transition-colors duration-200 ease-out hover:border-accent hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="font-editorialMono text-[11px] font-medium uppercase tracking-[0.15em] text-accent">
                      Question Map
                    </p>
                    <p className="mt-1 truncate font-body text-sm font-semibold text-foreground">
                      {currentSectionInfo?.title || currentQuestion?.section?.title || 'Current section'}
                    </p>
                    <p className="mt-1 font-body text-xs text-mutedFg">
                      {Math.min(currentIndex + 1, questions.length)} of {questions.length} questions
                    </p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm">
                    <LayoutList size={18} strokeWidth={2.5} />
                  </div>
                </button>

                {isMobileNavigatorOpen ? (
                  <div className="mt-4 space-y-4 border-t border-border pt-4">
                    <div className="max-h-[50vh] overflow-y-auto pr-1">
                      <QuestionNavigator
                        questions={questions}
                        currentQuestionId={currentQuestion?._id}
                        answers={answers}
                        onSelectQuestion={moveToQuestion}
                      />
                    </div>
                    <div className="rounded-2xl border border-border bg-muted/60 p-4 shadow-sm">
                      <p className="font-editorialMono text-xs font-medium uppercase tracking-[0.15em] text-accent">Session</p>
                      <p className="mt-3 font-body text-sm text-mutedFg">{isSaving ? 'Saving...' : formatSavedTime(lastSaved)}</p>
                      {systemMessage ? <p className="mt-3 font-body text-sm leading-7 text-foreground">{systemMessage}</p> : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {showSectionTransition && nextSectionInfo ? (
              <div className="flex flex-col items-center justify-center py-10 sm:py-16">
                <div className="editorial-panel w-full p-6 text-center animate-pop-in sm:p-10">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-quaternary shadow-sm sm:h-20 sm:w-20">
                    <CheckCircle size={40} strokeWidth={2.5} className="text-white sm:h-12 sm:w-12" />
                  </div>
                  <h2 className="mt-6 font-heading text-2xl font-semibold text-foreground sm:text-3xl">Section Complete!</h2>
                  <div className="mt-4 inline-flex max-w-full rounded-full border border-border bg-muted px-4 py-1 font-body text-sm font-semibold text-foreground">
                    {currentSectionInfo?.title || 'Current Section'}
                  </div>

                  <div className="mt-6 flex flex-col justify-center gap-4 sm:flex-row">
                    <div className="rounded-2xl border border-border bg-muted p-5 shadow-sm">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-quaternary shadow-sm">
                        <CheckCircle size={18} strokeWidth={2.5} className="text-white" />
                      </div>
                      <p className="mt-4 font-editorialMono text-xs font-medium uppercase tracking-[0.15em] text-mutedFg">Answered</p>
                      <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
                        {currentSectionAnsweredCount} / {currentSectionInfo?.items.length || 0}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-muted p-5 shadow-sm">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary shadow-sm">
                        <SkipForward size={18} strokeWidth={2.5} className="text-white" />
                      </div>
                      <p className="mt-4 font-editorialMono text-xs font-medium uppercase tracking-[0.15em] text-mutedFg">Skipped</p>
                      <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{currentSectionSkippedCount}</p>
                    </div>
                  </div>

                  <div className="my-8 border-t border-dashed border-border" />

                  <p className="font-editorialMono text-xs uppercase tracking-[0.15em] text-accent">Up Next</p>
                  <h3 className="mt-2 break-words font-heading text-xl font-semibold text-foreground sm:text-2xl">{nextSectionInfo.title}</h3>
                  <div className="mt-3 inline-flex rounded-full border border-accent bg-accent/10 px-3 py-1 font-body text-sm font-semibold text-foreground">
                    {nextSectionInfo.questionCount} questions
                  </div>

                  <button
                    type="button"
                    onClick={handleContinueToNextSection}
                    className="editorial-button-primary mt-8 w-full sm:w-auto"
                  >
                    Continue to Next Section
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="editorial-panel p-5 sm:p-6 lg:p-8">
                  {currentQuestion ? (
                    currentQuestion.type === 'mcq' ? (
                      <MCQQuestion
                        question={currentQuestion}
                        value={currentAnswer?.selectedOptionId || ''}
                        onChange={handleQuestionChange}
                        disableTranslate={antiCheatSettings.disableTranslate}
                      />
                    ) : (
                      <EssayQuestion
                        question={currentQuestion}
                        value={currentAnswer?.essayText || ''}
                        onChange={handleQuestionChange}
                        errorMessage={currentEssayErrorMessage}
                        disableTranslate={antiCheatSettings.disableTranslate}
                        disableAutocomplete={antiCheatSettings.disableAutocomplete}
                        disableSpellcheck={antiCheatSettings.disableSpellcheck}
                      />
                    )
                  ) : (
                    <div className="text-center text-mutedFg">No questions are available for this exam attempt.</div>
                  )}
                </div>

                <div className="mt-6 hidden sm:flex sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <button
                    type="button"
                    disabled={prevButtonDisabled}
                    onClick={() => moveToQuestion(currentIndex - 1)}
                    className={`min-h-[44px] w-full rounded-md border px-6 py-3 font-body text-sm font-semibold tracking-[0.04em] transition-all duration-200 ease-out sm:w-auto ${
                      prevButtonDisabled
                        ? 'border-border bg-muted text-mutedFg'
                        : 'border-foreground bg-transparent text-foreground hover:border-accent hover:bg-muted hover:text-accent'
                    }`}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={nextButtonDisabled}
                    onClick={handleNext}
                    className={`min-h-[44px] w-full rounded-md border px-6 py-3 font-body text-sm font-semibold tracking-[0.04em] transition-all duration-200 ease-out sm:w-auto ${
                      nextButtonDisabled
                        ? 'border-border bg-muted text-mutedFg'
                        : 'border-accent bg-accent text-accentFg shadow-sm hover:bg-accent-secondary'
                    }`}
                  >
                    {nextButtonLabel}
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {!showSectionTransition && currentQuestion ? (
        <div
          className={`fixed inset-x-0 z-20 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:hidden ${
            showNetworkLossBanner
              ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]'
              : 'bottom-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]'
          }`}
        >
          <div className="mx-auto flex max-w-[800px] gap-3">
            <button
              type="button"
              disabled={prevButtonDisabled}
              onClick={() => moveToQuestion(currentIndex - 1)}
              className={`min-h-[48px] flex-1 rounded-md border px-4 py-3 font-body text-sm font-semibold tracking-[0.04em] transition-all duration-200 ease-out ${
                prevButtonDisabled
                  ? 'border-border bg-muted text-mutedFg'
                  : 'border-foreground bg-transparent text-foreground hover:border-accent hover:bg-muted hover:text-accent'
              }`}
            >
              Prev
            </button>
            <button
              type="button"
              disabled={nextButtonDisabled}
              onClick={handleNext}
              className={`min-h-[48px] flex-1 rounded-md border px-4 py-3 font-body text-sm font-semibold tracking-[0.04em] transition-all duration-200 ease-out ${
                nextButtonDisabled
                  ? 'border-border bg-muted text-mutedFg'
                  : 'border-accent bg-accent text-accentFg shadow-sm hover:bg-accent-secondary'
              }`}
            >
              {nextButtonLabel}
            </button>
          </div>
        </div>
      ) : null}

      <SubmitConfirmModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirm={handleManualSubmit}
        unansweredCount={unansweredCount}
        isSubmitting={isSubmitting}
      />

      {shouldShowViolationOverlay && violationContent ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-foreground/60 p-6 backdrop-blur-sm">
          <div
            className="w-full max-w-sm rounded-2xl border border-secondary bg-card p-6 shadow-lg sm:p-8"
            style={isMobile ? { paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' } : undefined}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border bg-secondary shadow-sm">
              <violationContent.Icon size={24} strokeWidth={2.5} className="text-white" />
            </div>
            <h2 className="mt-6 text-center font-heading text-2xl font-semibold text-foreground">
              {violationContent.heading}
            </h2>
            <p className="mt-3 text-center font-body text-mutedFg">{violationContent.body}</p>
            <div
              className={`mt-5 inline-flex w-full flex-wrap items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-center font-body text-sm font-semibold ${
                isNearThreshold
                  ? 'border-red-500 bg-red-100 text-red-700'
                  : 'border-secondary bg-secondary/20 text-foreground'
              }`}
            >
              {isNearThreshold ? <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" /> : null}
              <span>
                {hasServerViolationCount
                  ? `Violation ${violationAlert.violationsCount} of ${violationThreshold} recorded`
                  : 'Violation recorded'}
              </span>
            </div>
            {isNearThreshold ? (
              <p className="mt-3 font-body text-sm font-medium text-secondary">One more violation will auto-submit your exam.</p>
            ) : null}
            <p className="mt-4 font-editorialMono text-xs uppercase tracking-[0.15em] text-mutedFg">Auto-dismissing in {violationDismissSeconds}s</p>
            <button
              type="button"
              onClick={() => setViolationAlert(null)}
              className={`mt-6 w-full rounded-md border px-6 py-3 font-body text-sm font-semibold tracking-[0.04em] transition-all duration-200 ease-out ${
                isMobile ? 'min-h-[56px]' : ''
              } ${
                isNearThreshold
                  ? 'border-secondary bg-secondary text-white hover:opacity-95'
                  : 'border-foreground bg-transparent text-foreground hover:border-accent hover:bg-muted hover:text-accent'
              }`}
            >
              {isNearThreshold ? 'Return to Exam — Last Warning' : 'I Understand'}
            </button>
          </div>
        </div>
      ) : null}

      {showFullscreenGate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-6">
          <div className="editorial-panel w-full max-w-sm p-6 text-center sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-tertiary shadow-sm">
              <Maximize size={40} strokeWidth={2.5} className="text-white" />
            </div>
            <h2 className="mt-6 font-heading text-2xl font-semibold text-foreground sm:text-3xl">Fullscreen Required</h2>
            <p className="mt-3 font-body text-mutedFg">
              This exam must be taken in fullscreen mode. Click the button below to continue.
            </p>
            <button
              type="button"
              onClick={() => enter()}
              className="editorial-button-primary mt-8 w-full justify-center"
            >
              Enter Fullscreen
            </button>
            <p className="mt-4 font-editorialMono text-xs uppercase tracking-[0.15em] text-mutedFg">
              {isSupported
                ? 'If your browser blocks fullscreen, please allow it in your browser settings.'
                : 'Your browser does not appear to support fullscreen mode for this exam.'}
            </p>
          </div>
        </div>
      ) : null}

      {showFullscreenRecovery ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-secondary bg-card p-6 text-center shadow-lg sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border bg-secondary shadow-sm animate-wiggle">
              <AlertTriangle size={24} strokeWidth={2.5} className="text-white" />
            </div>
            <h2 className="mt-6 font-heading text-2xl font-semibold text-foreground">Fullscreen Exited</h2>
            <p className="mt-3 font-body text-mutedFg">Leaving fullscreen is a violation. This has been logged.</p>
            <div className="mt-5 inline-flex rounded-full border border-secondary bg-secondary/20 px-4 py-1 font-body text-sm font-semibold text-foreground">
              Violations: {fullscreenViolationCount} of {violationThreshold}
            </div>
            <button
              type="button"
              onClick={() => enter()}
              className="editorial-button-primary mt-8 w-full justify-center"
            >
              Return to Fullscreen
            </button>
          </div>
        </div>
      ) : null}

      {showNetworkLossBanner ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 flex flex-col items-start gap-4 border-t border-border bg-card/95 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-secondary bg-secondary/15 text-secondary">
              <WifiOff size={18} strokeWidth={2.5} />
            </div>
            <span className="font-body font-medium text-foreground">Connection lost — your answers may not be saving</span>
          </div>
          <button
            type="button"
            onClick={handleRetrySave}
            className="editorial-button-secondary w-full px-4 py-2 text-sm sm:w-auto"
          >
            Retry Now
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default ExamPage;







