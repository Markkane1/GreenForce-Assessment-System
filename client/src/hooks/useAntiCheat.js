import { useEffect, useRef } from 'react';
import * as examService from '../services/examService';

const THROTTLE_MS = 1500;

const useAntiCheat = ({ attemptId, onViolation, onForceSubmit }) => {
  const throttleRef = useRef({});

  useEffect(() => {
    if (!attemptId) {
      return undefined;
    }

    // Client-side listeners are advisory only; server-side violation counts remain authoritative.

    const triggerViolation = async (eventType, metadata = {}) => {
      const now = Date.now();
      const lastTriggeredAt = throttleRef.current[eventType] || 0;

      if (now - lastTriggeredAt < THROTTLE_MS) {
        return;
      }

      throttleRef.current[eventType] = now;

      try {
        const response = await examService.logViolation(attemptId, eventType, metadata);

        if (response.forceSubmitted) {
          onForceSubmit?.(response);
          return;
        }

        onViolation?.(eventType, response.violationsCount ?? 0, Boolean(response.forceSubmitted));
      } catch {
        onViolation?.(eventType, 0, false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('tab_switch');
      }
    };

    const handleCopy = (event) => {
      event.preventDefault();
      triggerViolation('copy_attempt');
    };

    const handleWindowBlur = () => {
      triggerViolation('window_blur');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', handleCopy);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', handleCopy);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [attemptId, onForceSubmit, onViolation]);
};

export default useAntiCheat;
