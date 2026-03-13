import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle,
  CloudUpload,
  CircleHelp,
  Clipboard,
  Clock,
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
import useAutosave from '../../hooks/useAutosave';
import useExamTimer from '../../hooks/useExamTimer';
import useFullscreen from '../../hooks/useFullscreen';
import * as examService from '../../services/examService';

const LAST_RESULT_KEY = 'last_exam_result_attempt';
const VIOLATION_THRESHOLD = 3;
const RESULT_REDIRECT_SECONDS = 5;
const EXPIRING_SCREEN_MIN_MS = 1500;
const getActiveAttemptKey = (scheduleId) => `active_exam_attempt_${scheduleId}`;

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

const getSectionIndexForQuestion = (sections, questionIndex) =>
  sections.findIndex((section) => questionIndex >= section.startIndex && questionIndex <= section.endIndex);

const eventContentMap = {
  fullscreen_exit: {
    Icon: Minimize2,
    heading: 'Fullscreen Exited',
    body: 'You left fullscreen mode. This has been recorded.',
  },
  tab_switch: {
    Icon: EyeOff,
    heading: 'Focus Lost',
    body: 'You switched away from this exam. This has been recorded.',
  },
  window_blur: {
    Icon: EyeOff,
    heading: 'Focus Lost',
    body: 'You switched away from this exam. This has been recorded.',
  },
  copy_attempt: {
    Icon: Clipboard,
    heading: 'Copy Detected',
    body: 'Copying exam content is not allowed. This has been recorded.',
  },
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

const ExamPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: scheduleId } = useParams();
  const prevFullscreenRef = useRef(false);

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
  const [systemMessage, setSystemMessage] = useState(location.state?.message || '');
  const [resumeBanner, setResumeBanner] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(null);
  const [hasBeenFullscreen, setHasBeenFullscreen] = useState(false);
  const [fullscreenViolationCount, setFullscreenViolationCount] = useState(0);
  const [pendingViolationAlert, setPendingViolationAlert] = useState(null);
  const [violationAlert, setViolationAlert] = useState(null);
  const [violationDismissSeconds, setViolationDismissSeconds] = useState(8);
  const [submissionReason, setSubmissionReason] = useState(null);
  const [redirectCountdown, setRedirectCountdown] = useState(RESULT_REDIRECT_SECONDS);
  const { enter, exit, isFullscreen, isSupported } = useFullscreen();

  const sections = useMemo(() => buildSections(questions), [questions]);
  const currentSectionInfo = sections[currentSectionIndex] || null;
  const currentQuestion = questions[currentIndex] || null;
  const currentAnswer = currentQuestion ? answers[currentQuestion._id] : null;

  const isCurrentEssayTooLong = useMemo(() => {
    if (currentQuestion?.type !== 'essay' || !currentQuestion.maxWordCount) {
      return false;
    }

    return getWordCount(currentAnswer?.essayText || '') > currentQuestion.maxWordCount;
  }, [currentAnswer?.essayText, currentQuestion]);

  const currentEssayErrorMessage = isCurrentEssayTooLong
    ? `Essay answers cannot exceed ${currentQuestion?.maxWordCount} words.`
    : '';

  const currentAnswerPayload = useMemo(
    () =>
      currentQuestion
        ? {
            selectedOptionId: currentAnswer?.selectedOptionId || '',
            essayText: currentAnswer?.essayText || '',
          }
        : null,
    [currentAnswer, currentQuestion],
  );

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

  const showFullscreenGate = examPhase === 'active' && !isFullscreen && !hasBeenFullscreen;
  const showFullscreenRecovery = examPhase === 'active' && !isFullscreen && hasBeenFullscreen;
  const violationContent = violationAlert
    ? eventContentMap[violationAlert.eventType] || eventContentMap.window_blur
    : null;
  const isNearThreshold = violationAlert?.violationsCount === VIOLATION_THRESHOLD - 1;
  const submissionContent = submissionReason ? submissionContentMap[submissionReason] : null;

  const persistQuestion = useCallback(
    async (questionIndex) => {
      const question = questions[questionIndex];

      if (!attempt?._id || !question) {
        return;
      }

      const answer = answers[question._id];

      if (!hasAnswerValue(question, answer)) {
        return;
      }

      if (question.type === 'essay' && question.maxWordCount && getWordCount(answer?.essayText || '') > question.maxWordCount) {
        throw new Error(`Essay answers cannot exceed ${question.maxWordCount} words.`);
      }

      await examService.saveAnswer(attempt._id, question._id, answer);
    },
    [answers, attempt?._id, questions],
  );

  const handleQuestionChange = useCallback(
    (value) => {
      if (!currentQuestion) {
        return;
      }

      setAnswers((currentAnswers) => ({
        ...currentAnswers,
        [currentQuestion._id]: currentQuestion.type === 'mcq'
          ? {
              selectedOptionId: value,
              essayText: '',
            }
          : {
              selectedOptionId: '',
              essayText: value,
            },
      }));

      setErrorMessage('');
    },
    [currentQuestion],
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
      sessionStorage.removeItem(getActiveAttemptKey(scheduleId));
      sessionStorage.setItem(LAST_RESULT_KEY, resolvedAttempt._id);
      await exit().catch(() => {});
    },
    [attempt, exit, scheduleId],
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
  }, [attempt?._id, examPhase, finalizeSubmissionState]);

  const { secondsLeft, formattedTime } = useExamTimer(timerSeconds, handleTimerExpire);

  const { lastSaved, isSaving, saveStatus, failCount, retrySave, setSaveStatus } = useAutosave({
    attemptId: examPhase === 'active' ? attempt?._id : null,
    questionId: examPhase === 'active' ? currentQuestion?._id : null,
    answer: currentAnswerPayload,
    enabled: Boolean(
      examPhase === 'active'
      && attempt?._id
      && currentQuestion
      && attempt.status === 'in_progress'
      && !isCurrentEssayTooLong
      && !showSectionTransition
      && !showFullscreenGate
      && !showFullscreenRecovery
    ),
    onError: (error) => setErrorMessage(error.message || 'Unable to save your answer.'),
  });
  const savedStatusLabel = lastSaved
    ? `Saved ${lastSaved.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : 'Saved';
  const showNetworkLossBanner = failCount >= 2;

  useAntiCheat({
    attemptId: examPhase === 'active' ? attempt?._id : null,
    onViolation: (eventType, violationsCount, forceSubmitted) => {
      setAttempt((currentAttempt) =>
        currentAttempt
          ? { ...currentAttempt, violationsCount: violationsCount || currentAttempt.violationsCount }
          : currentAttempt,
      );

      if (forceSubmitted) {
        return;
      }

      setViolationAlert({ eventType, violationsCount, forceSubmitted: false });
    },
    onForceSubmit: handleForceSubmit,
  });

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
          });
        } catch {
          setPendingViolationAlert({
            eventType: 'fullscreen_exit',
            violationsCount: attempt.violationsCount || fullscreenViolationCount || 0,
            forceSubmitted: false,
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
      setViolationDismissSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    const timeoutId = window.setTimeout(() => {
      setViolationAlert(null);
    }, 8000);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
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
    const handleOnline = () => {
      retrySave();
    };

    const handleOffline = () => {
      setSaveStatus('error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [retrySave, setSaveStatus]);

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

      const nextSections = buildSections(response.questions);

      setAttempt(response.attempt);
      setQuestions(response.questions);
      setAnswers(createAnswerMap(response.questions));
      setCurrentIndex(0);
      setCurrentSectionIndex(0);
      setShowSectionTransition(false);
      setNextSectionInfo(null);
      setSubmissionReason(null);
      setRedirectCountdown(RESULT_REDIRECT_SECONDS);
      setTimerSeconds(response.resumed ? response.remainingSeconds : response.attempt.remainingTimeSeconds);
      setResumeBanner(response.resumed ? `Resuming your exam — ${formatMmSs(response.remainingSeconds)} remaining` : '');
      setHasBeenFullscreen(false);
      setFullscreenViolationCount(response.attempt.violationsCount || 0);
      setViolationAlert(null);
      setPendingViolationAlert(null);
      prevFullscreenRef.current = false;
      sessionStorage.setItem(getActiveAttemptKey(scheduleId), response.attempt._id);

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
      await persistQuestion(currentIndex);
      setShowSectionTransition(false);
      setNextSectionInfo(null);
      setCurrentIndex(nextIndex);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save your answer.');
    }
  };

  const handleNext = async () => {
    try {
      await persistQuestion(currentIndex);

      if (currentSectionInfo && currentIndex === currentSectionInfo.endIndex) {
        const upcomingSection = sections[currentSectionIndex + 1];

        if (upcomingSection) {
          setNextSectionInfo({
            title: upcomingSection.title,
            questionCount: upcomingSection.items.length,
            sectionIndex: currentSectionIndex + 1,
          });
          setShowSectionTransition(true);
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
      setErrorMessage(error.message || 'Unable to save your answer.');
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
  };

  const handleManualSubmit = async () => {
    if (!attempt?._id) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setExamPhase('expiring');

    try {
      await persistQuestion(currentIndex);
      const [submittedAttempt] = await Promise.all([
        examService.submitExam(attempt._id),
        wait(EXPIRING_SCREEN_MIN_MS),
      ]);
      await finalizeSubmissionState('manual', submittedAttempt);
    } catch (error) {
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
    } catch {
      // The hook already updates save state and error handling.
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
        <div className="max-w-xl rounded-[2rem] border-2 border-secondary bg-card p-8 text-center shadow-pop-soft">
          <h2 className="font-heading text-3xl font-extrabold text-foreground">Exam unavailable</h2>
          <p className="mt-4 text-mutedFg">{errorMessage}</p>
          <button
            type="button"
            onClick={() => navigate('/student/dashboard')}
            className="mt-6 rounded-full border-2 border-foreground bg-secondary px-5 py-3 font-bold text-foreground shadow-pop"
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
      <div className="relative min-h-screen overflow-y-auto bg-background px-6 py-10">
        <svg className="absolute inset-0 h-full w-full opacity-20" aria-hidden="true">
          <defs>
            <pattern id="exam-preview-dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="2" fill="#1E293B" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#exam-preview-dot-grid)" />
        </svg>

        <div className="relative z-10 mx-auto w-full max-w-lg rounded-xl border-2 border-foreground bg-card p-8 shadow-pop animate-pop-in">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-foreground bg-accent shadow-pop-press">
            <BookOpen size={32} strokeWidth={2.5} className="text-white" />
          </div>

          <h1 className="mt-4 font-heading text-2xl font-extrabold text-foreground">
            {schedulePreview?.testId?.title || 'Exam Preview'}
          </h1>
          <p className="mt-2 text-sm text-mutedFg">
            Available until {schedulePreview?.endTime ? new Date(schedulePreview.endTime).toLocaleString() : '--'}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
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
                label: 'Passing Score',
                value: `${schedulePreview?.testId?.passingScore || 0}%`,
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
                <div key={item.label} className="rounded-lg border-2 border-border bg-muted p-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground ${item.tone} shadow-pop-press`}>
                    <Icon size={18} strokeWidth={2.5} className="text-foreground" />
                  </div>
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-mutedFg">{item.label}</p>
                  <p className="mt-1 font-heading text-lg font-bold text-foreground">{item.value}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6">
            <p className="font-heading text-sm font-bold uppercase tracking-[0.18em] text-mutedFg">Before you begin</p>
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
                <div key={rule} className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-quaternary shadow-pop-press">
                    <Check size={14} strokeWidth={2.5} className="text-foreground" />
                  </div>
                  <p className="text-sm text-foreground">{rule}</p>
                </div>
              ))}
            </div>
          </div>

          {attemptsTaken > 0 && attemptsTaken < maxAttempts ? (
            <div className="mt-6 rounded-lg border-2 border-tertiary bg-tertiary/20 p-3">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} strokeWidth={2.5} className="mt-0.5 text-foreground" />
                <p className="text-sm text-foreground">
                  You have used {attemptsTaken} of {maxAttempts} attempts. You have {remainingAttempts} attempt(s) left.
                </p>
              </div>
            </div>
          ) : null}

          {!hasAttemptsLeft ? (
            <div className="mt-6 rounded-lg border-2 border-secondary bg-secondary/20 p-3 text-sm font-medium text-foreground">
              You have used all attempts for this exam.
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 rounded-full border-2 border-foreground bg-secondary px-6 py-3 font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
            >
              Back
            </button>

            {hasAttemptsLeft ? (
              <button
                type="button"
                onClick={handleBeginExam}
                disabled={isLoading}
                className="flex-1 rounded-full border-2 border-foreground bg-accent px-6 py-3 font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press disabled:cursor-not-allowed disabled:opacity-70"
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
                className="flex-1 rounded-full border-2 border-foreground bg-secondary px-6 py-3 font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
              >
                Back to Dashboard
              </button>
            )}
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
        <div className="w-full max-w-sm rounded-xl border-2 border-foreground bg-card p-8 text-center shadow-pop animate-pop-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-foreground bg-secondary shadow-pop">
            <Clock size={40} strokeWidth={2.5} className="text-white" />
          </div>
          <h2 className="mt-6 font-heading text-3xl font-extrabold text-foreground">Time&apos;s Up!</h2>
          <p className="mt-3 text-mutedFg">Your time has expired. We&apos;re submitting your answers now...</p>
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
        <div className="w-full max-w-md rounded-xl border-2 border-foreground bg-card p-10 text-center shadow-pop animate-pop-in">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-foreground ${submissionContent.tone} shadow-pop`}>
            <SubmissionIcon size={40} strokeWidth={2.5} className="text-white" />
          </div>
          <h2 className="mt-6 font-heading text-3xl font-extrabold text-foreground">{submissionContent.heading}</h2>
          <p className="mt-3 text-mutedFg">{submissionContent.body}</p>
          <p className="mt-5 text-xs text-mutedFg">
            Redirecting to your results in {redirectCountdown} seconds...
          </p>
          <button
            type="button"
            onClick={handleViewResultsNow}
            className="mt-7 rounded-full border-2 border-foreground bg-accent px-6 py-3 font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
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
        <div className="max-w-xl rounded-[2rem] border-2 border-secondary bg-card p-8 text-center shadow-pop-soft">
          <h2 className="font-heading text-3xl font-extrabold text-foreground">Exam unavailable</h2>
          <p className="mt-4 text-mutedFg">{errorMessage}</p>
          <button
            type="button"
            onClick={() => navigate('/student/dashboard')}
            className="mt-6 rounded-full border-2 border-foreground bg-secondary px-5 py-3 font-bold text-foreground shadow-pop"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b-2 border-foreground bg-card px-6">
        <div>
          <p className="font-heading text-xl font-bold text-foreground">
            {currentSectionInfo?.title || currentQuestion?.section?.title || 'Exam Section'}
          </p>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-mutedFg">
            Question {Math.min(currentIndex + 1, questions.length)} of {questions.length}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === 'saving' ? (
            <div className="inline-flex items-center gap-2 text-xs text-mutedFg">
              <CloudUpload size={16} strokeWidth={2.5} className="animate-pulse" />
              <span>Saving...</span>
            </div>
          ) : null}
          {saveStatus === 'saved' ? (
            <div className="inline-flex items-center gap-2 text-xs text-mutedFg">
              <Check size={16} strokeWidth={2.5} className="text-quaternary" />
              <span>{savedStatusLabel}</span>
            </div>
          ) : null}
          {saveStatus === 'error' ? (
            <div className="inline-flex items-center gap-2 text-xs font-medium text-secondary">
              <WifiOff size={16} strokeWidth={2.5} />
              <span>Not saved</span>
            </div>
          ) : null}
          <CountdownTimer secondsLeft={secondsLeft} formattedTime={formattedTime} />
          <button
            type="button"
            disabled={isCurrentEssayTooLong || showSectionTransition || examPhase !== 'active'}
            onClick={() => setIsSubmitModalOpen(true)}
            className={`rounded-full border-2 px-5 py-2.5 font-bold ${
              isCurrentEssayTooLong || showSectionTransition || examPhase !== 'active'
                ? 'border-border bg-muted text-mutedFg'
                : 'border-foreground bg-secondary text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press'
            }`}
          >
            Submit
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 overflow-y-auto border-r-2 border-border bg-card p-4">
          <QuestionNavigator
            questions={questions}
            currentQuestionId={currentQuestion?._id}
            answers={answers}
            onSelectQuestion={moveToQuestion}
          />
          <div className="mt-6 rounded-[1.25rem] border-2 border-border bg-background p-4 text-sm text-mutedFg">
            <p>{isSaving ? 'Saving...' : formatSavedTime(lastSaved)}</p>
            {systemMessage ? <p className="mt-2 text-foreground">{systemMessage}</p> : null}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-[800px]">
            {errorMessage ? (
              <div className="mb-5 rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
                {errorMessage}
              </div>
            ) : null}
            {resumeBanner ? (
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-tertiary px-4 py-2 text-sm font-bold text-foreground shadow-pop-press">
                <RotateCcw size={16} strokeWidth={2.5} />
                {resumeBanner}
              </div>
            ) : null}

            {showSectionTransition && nextSectionInfo ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-full rounded-xl border-2 border-foreground bg-card p-10 text-center shadow-pop animate-pop-in">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-foreground bg-quaternary shadow-pop">
                    <CheckCircle size={48} strokeWidth={2.5} className="text-white" />
                  </div>
                  <h2 className="mt-6 font-heading text-3xl font-extrabold text-foreground">Section Complete!</h2>
                  <div className="mt-4 inline-flex rounded-full border-2 border-border bg-muted px-4 py-1 font-heading text-sm font-bold text-foreground">
                    {currentSectionInfo?.title || 'Current Section'}
                  </div>

                  <div className="mt-6 flex flex-col justify-center gap-4 sm:flex-row">
                    <div className="rounded-lg border-2 border-border bg-muted p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground bg-quaternary shadow-pop-press">
                        <CheckCircle size={18} strokeWidth={2.5} className="text-white" />
                      </div>
                      <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-mutedFg">Answered</p>
                      <p className="mt-1 font-heading text-lg font-bold text-foreground">
                        {currentSectionAnsweredCount} / {currentSectionInfo?.items.length || 0}
                      </p>
                    </div>
                    <div className="rounded-lg border-2 border-border bg-muted p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground bg-secondary shadow-pop-press">
                        <SkipForward size={18} strokeWidth={2.5} className="text-white" />
                      </div>
                      <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-mutedFg">Skipped</p>
                      <p className="mt-1 font-heading text-lg font-bold text-foreground">{currentSectionSkippedCount}</p>
                    </div>
                  </div>

                  <div className="my-6 border-t-2 border-dashed border-border" />

                  <p className="text-xs uppercase tracking-[0.18em] text-mutedFg">Up Next</p>
                  <h3 className="mt-2 font-heading text-xl font-bold text-foreground">{nextSectionInfo.title}</h3>
                  <div className="mt-3 inline-flex rounded-full border border-accent bg-accent/10 px-3 py-1 text-sm font-heading font-bold text-foreground">
                    {nextSectionInfo.questionCount} questions
                  </div>

                  <button
                    type="button"
                    onClick={handleContinueToNextSection}
                    className="mt-8 rounded-full border-2 border-foreground bg-accent px-6 py-3 font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
                  >
                    Continue to Next Section
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-xl border-2 border-foreground bg-card p-8 shadow-pop-soft">
                  {currentQuestion ? (
                    currentQuestion.type === 'mcq' ? (
                      <MCQQuestion
                        question={currentQuestion}
                        value={currentAnswer?.selectedOptionId || ''}
                        onChange={handleQuestionChange}
                      />
                    ) : (
                      <EssayQuestion
                        question={currentQuestion}
                        value={currentAnswer?.essayText || ''}
                        onChange={handleQuestionChange}
                        errorMessage={currentEssayErrorMessage}
                      />
                    )
                  ) : (
                    <div className="text-center text-mutedFg">No questions are available for this exam attempt.</div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    disabled={currentIndex === 0 || isCurrentEssayTooLong}
                    onClick={() => moveToQuestion(currentIndex - 1)}
                    className={`rounded-full border-2 px-6 py-3 font-bold ${
                      currentIndex === 0 || isCurrentEssayTooLong
                        ? 'border-border bg-muted text-mutedFg'
                        : 'border-foreground bg-secondary text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press'
                    }`}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={isCurrentEssayTooLong}
                    onClick={handleNext}
                    className={`rounded-full border-2 px-6 py-3 font-bold ${
                      isCurrentEssayTooLong
                        ? 'border-border bg-muted text-mutedFg'
                        : 'border-foreground bg-accent text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press'
                    }`}
                  >
                    {currentSectionInfo && currentIndex === currentSectionInfo.endIndex
                      ? currentSectionIndex === sections.length - 1
                        ? 'Review & Submit'
                        : 'Next'
                      : currentIndex === questions.length - 1
                        ? 'Review & Submit'
                        : 'Next'}
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      <SubmitConfirmModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirm={handleManualSubmit}
        unansweredCount={unansweredCount}
        isSubmitting={isSubmitting}
      />

      {violationAlert && violationContent ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-foreground/60 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border-2 border-secondary bg-card p-8 shadow-pop-pink">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-foreground bg-secondary shadow-pop-press">
              <violationContent.Icon size={24} strokeWidth={2.5} className="text-white" />
            </div>
            <h2 className="mt-6 text-center font-heading text-2xl font-extrabold text-foreground">
              {violationContent.heading}
            </h2>
            <p className="mt-3 text-center text-mutedFg">{violationContent.body}</p>
            <div
              className={`mt-5 inline-flex rounded-full border-2 px-4 py-1 font-heading text-sm font-bold ${
                isNearThreshold
                  ? 'border-red-500 bg-red-100 text-red-700'
                  : 'border-secondary bg-secondary/20 text-foreground'
              }`}
            >
              {isNearThreshold
                ? 'One more violation will auto-submit your exam'
                : `Violation ${violationAlert.violationsCount} of ${VIOLATION_THRESHOLD} recorded`}
            </div>
            <p className="mt-4 text-xs text-mutedFg">Auto-dismissing in {violationDismissSeconds}s</p>
            <button
              type="button"
              onClick={() => setViolationAlert(null)}
              className="mt-6 w-full rounded-full border-2 border-foreground bg-secondary px-6 py-3 font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
            >
              I Understand
            </button>
          </div>
        </div>
      ) : null}

      {showFullscreenGate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-6">
          <div className="w-full max-w-sm rounded-xl border-2 border-foreground bg-card p-8 text-center shadow-pop">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-foreground bg-tertiary shadow-pop-press">
              <Maximize size={40} strokeWidth={2.5} className="text-white" />
            </div>
            <h2 className="mt-6 font-heading text-2xl font-extrabold text-foreground">Fullscreen Required</h2>
            <p className="mt-3 text-mutedFg">
              This exam must be taken in fullscreen mode. Click the button below to continue.
            </p>
            <button
              type="button"
              onClick={() => enter()}
              className="mt-6 w-full rounded-full border-2 border-foreground bg-accent px-6 py-3 font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
            >
              Enter Fullscreen
            </button>
            <p className="mt-4 text-xs text-mutedFg">
              {isSupported
                ? 'If your browser blocks fullscreen, please allow it in your browser settings.'
                : 'Your browser does not appear to support fullscreen mode for this exam.'}
            </p>
          </div>
        </div>
      ) : null}

      {showFullscreenRecovery ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border-2 border-secondary bg-card p-8 text-center shadow-pop-pink">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-foreground bg-secondary shadow-pop animate-wiggle">
              <AlertTriangle size={24} strokeWidth={2.5} className="text-white" />
            </div>
            <h2 className="mt-6 font-heading text-2xl font-extrabold text-foreground">Fullscreen Exited</h2>
            <p className="mt-3 text-mutedFg">Leaving fullscreen is a violation. This has been logged.</p>
            <div className="mt-5 inline-flex rounded-full border-2 border-secondary bg-secondary/20 px-4 py-1 font-heading text-sm font-bold text-foreground">
              Violations: {fullscreenViolationCount} of {VIOLATION_THRESHOLD}
            </div>
            <button
              type="button"
              onClick={() => enter()}
              className="mt-6 w-full rounded-full border-2 border-foreground bg-accent px-6 py-3 font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
            >
              Return to Fullscreen
            </button>
          </div>
        </div>
      ) : null}

      {showNetworkLossBanner ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-4 border-t-2 border-foreground bg-secondary px-6 py-3">
          <div className="flex items-center gap-3 text-white">
            <WifiOff size={18} strokeWidth={2.5} />
            <span className="font-medium">Connection lost — your answers may not be saving</span>
          </div>
          <button
            type="button"
            onClick={handleRetrySave}
            className="rounded-full border-2 border-foreground bg-white px-4 py-2 text-sm font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
          >
            Retry Now
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default ExamPage;





