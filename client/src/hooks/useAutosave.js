import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { saveAnswer as saveAnswerRequest } from '../services/examService';

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

const useAutosave = ({ attemptId, questionId, answer, enabled, onError }) => {
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [failCount, setFailCount] = useState(0);
  const latestPayloadRef = useRef({ attemptId, questionId, answer, enabled });

  latestPayloadRef.current = { attemptId, questionId, answer, enabled };

  const answerKey = useMemo(() => JSON.stringify(answer || {}), [answer]);

  const persist = useCallback(async () => {
    const currentPayload = latestPayloadRef.current;

    if (
      !currentPayload.enabled
      || !currentPayload.attemptId
      || !currentPayload.questionId
      || !hasSavableAnswer(currentPayload.answer)
    ) {
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      await saveAnswerRequest(
        currentPayload.attemptId,
        currentPayload.questionId,
        currentPayload.answer,
      );
      setLastSaved(new Date());
      setSaveStatus('saved');
      setFailCount(0);
    } catch (error) {
      setSaveStatus('error');
      setFailCount((current) => current + 1);
      onError?.(error);
    } finally {
      setIsSaving(false);
    }
  }, [onError]);

  useEffect(() => {
    if (!enabled || !attemptId || !questionId || !hasSavableAnswer(answer)) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      persist();
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [answerKey, attemptId, enabled, persist, questionId]);

  useEffect(() => {
    if (!enabled || !attemptId || !questionId) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      persist();
    }, 20000);

    return () => window.clearInterval(intervalId);
  }, [attemptId, enabled, persist, questionId]);

  return {
    saveStatus,
    lastSaved,
    isSaving,
    failCount,
    retrySave: persist,
    setSaveStatus,
  };
};

export default useAutosave;
