import { useCallback, useEffect, useRef, useState } from 'react';
import { saveAnswersBatch as saveAnswersBatchRequest } from '../services/examService';

const DEFAULT_INTERVAL_MS = 60000;

const hasSavableAnswer = (answer) => {
  if (!answer) {
    return false;
  }

  if (answer.selectedOptionId) {
    return true;
  }

  if (typeof answer.essayText === 'string' && answer.essayText.trim().length > 0) {
    return true;
  }

  return false;
};

const normalizeAnswer = (answer = {}) => ({
  selectedOptionId: answer.selectedOptionId || '',
  essayText: answer.essayText || '',
});

const getDraftStorageKey = (attemptId) => `exam_pending_answers_${attemptId}`;

const readDraftEntries = (attemptId) => {
  if (!attemptId || typeof window === 'undefined') {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(getDraftStorageKey(attemptId));

    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeDraftEntries = (attemptId, entries) => {
  if (!attemptId || typeof window === 'undefined') {
    return;
  }

  if (!entries || Object.keys(entries).length === 0) {
    window.localStorage.removeItem(getDraftStorageKey(attemptId));
    return;
  }

  window.localStorage.setItem(getDraftStorageKey(attemptId), JSON.stringify(entries));
};

export const mergeDraftAnswers = (attemptId, baseAnswers = {}, validQuestionIds = []) => {
  const drafts = readDraftEntries(attemptId);
  const validIds = new Set(validQuestionIds.map((questionId) => questionId.toString()));

  return Object.entries(drafts).reduce((mergedAnswers, [questionId, entry]) => {
    if (!validIds.has(questionId)) {
      return mergedAnswers;
    }

    const nextAnswer = normalizeAnswer(entry?.answer);

    if (!hasSavableAnswer(nextAnswer)) {
      return mergedAnswers;
    }

    return {
      ...mergedAnswers,
      [questionId]: nextAnswer,
    };
  }, { ...baseAnswers });
};

const useAutosave = ({
  attemptId,
  enabled,
  onError,
  intervalMs = DEFAULT_INTERVAL_MS,
}) => {
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [failCount, setFailCount] = useState(0);
  const dirtyAnswersRef = useRef({});
  const activeAttemptIdRef = useRef(attemptId);
  const flushPromiseRef = useRef(null);
  const flushQueuedRef = useRef(false);

  useEffect(() => {
    activeAttemptIdRef.current = attemptId;
    dirtyAnswersRef.current = readDraftEntries(attemptId);

    if (!attemptId) {
      setLastSaved(null);
      setIsSaving(false);
      setSaveStatus('idle');
      setFailCount(0);
    }
  }, [attemptId]);

  const queueAnswer = useCallback((questionId, answer) => {
    const activeAttemptId = activeAttemptIdRef.current;

    if (!activeAttemptId || !questionId) {
      return;
    }

    const normalizedAnswer = normalizeAnswer(answer);
    const nextEntries = {
      ...dirtyAnswersRef.current,
    };

    if (hasSavableAnswer(normalizedAnswer)) {
      nextEntries[questionId] = {
        answer: normalizedAnswer,
        updatedAt: Date.now(),
      };
      setSaveStatus('idle');
    } else {
      delete nextEntries[questionId];
    }

    dirtyAnswersRef.current = nextEntries;
    writeDraftEntries(activeAttemptId, nextEntries);
  }, []);

  const clearDraftAnswers = useCallback((draftAttemptId = activeAttemptIdRef.current) => {
    if (!draftAttemptId) {
      return;
    }

    if (draftAttemptId === activeAttemptIdRef.current) {
      dirtyAnswersRef.current = {};
    }

    writeDraftEntries(draftAttemptId, {});
  }, []);

  const flushPendingAnswers = useCallback(async () => {
    const activeAttemptId = activeAttemptIdRef.current;

    if (!enabled || !activeAttemptId) {
      return { savedCount: 0, questionIds: [] };
    }

    if (flushPromiseRef.current) {
      flushQueuedRef.current = true;
      return flushPromiseRef.current;
    }

    const runFlush = async () => {
      const pendingEntries = Object.entries(dirtyAnswersRef.current)
        .filter(([, entry]) => hasSavableAnswer(entry?.answer))
        .map(([questionId, entry]) => ({
          questionId,
          answer: normalizeAnswer(entry.answer),
          updatedAt: entry.updatedAt || Date.now(),
        }));

      if (pendingEntries.length === 0) {
        return { savedCount: 0, questionIds: [] };
      }

      setIsSaving(true);
      setSaveStatus('saving');

      try {
        const response = await saveAnswersBatchRequest(
          activeAttemptId,
          pendingEntries.map(({ questionId, answer }) => ({
            questionId,
            answer,
          })),
        );

        const remainingEntries = { ...dirtyAnswersRef.current };

        pendingEntries.forEach(({ questionId, updatedAt }) => {
          const currentEntry = remainingEntries[questionId];

          if (currentEntry && currentEntry.updatedAt === updatedAt) {
            delete remainingEntries[questionId];
          }
        });

        dirtyAnswersRef.current = remainingEntries;
        writeDraftEntries(activeAttemptId, remainingEntries);
        setLastSaved(new Date());
        setSaveStatus('saved');
        setFailCount(0);

        return response;
      } catch (error) {
        setSaveStatus('error');
        setFailCount((current) => current + 1);
        onError?.(error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    };

    flushPromiseRef.current = runFlush();

    try {
      const result = await flushPromiseRef.current;
      return result;
    } finally {
      flushPromiseRef.current = null;

      if (flushQueuedRef.current) {
        flushQueuedRef.current = false;

        if (Object.keys(dirtyAnswersRef.current).length > 0) {
          await flushPendingAnswers();
        }
      }
    }
  }, [enabled, onError]);

  useEffect(() => {
    if (!enabled || !attemptId) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void flushPendingAnswers();
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [attemptId, enabled, flushPendingAnswers, intervalMs]);

  useEffect(() => {
    if (!attemptId) {
      return undefined;
    }

    const flushOnVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void flushPendingAnswers();
      }
    };

    const flushOnPageHide = () => {
      void flushPendingAnswers();
    };

    const flushOnOnline = () => {
      void flushPendingAnswers();
    };

    document.addEventListener('visibilitychange', flushOnVisibilityChange);
    window.addEventListener('pagehide', flushOnPageHide);
    window.addEventListener('online', flushOnOnline);

    return () => {
      document.removeEventListener('visibilitychange', flushOnVisibilityChange);
      window.removeEventListener('pagehide', flushOnPageHide);
      window.removeEventListener('online', flushOnOnline);
    };
  }, [attemptId, flushPendingAnswers]);

  return {
    saveStatus,
    lastSaved,
    isSaving,
    failCount,
    queueAnswer,
    retrySave: flushPendingAnswers,
    flushPendingAnswers,
    clearDraftAnswers,
    setSaveStatus,
  };
};

export default useAutosave;
