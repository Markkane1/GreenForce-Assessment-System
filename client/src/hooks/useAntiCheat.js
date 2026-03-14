import { useEffect, useRef } from 'react';
import * as examService from '../services/examService';

const MOBILE_REGEX = /iPhone|iPad|iPod|Android/i;
const IOS_REGEX = /iPhone|iPad|iPod/i;
const DEBOUNCE_MS = 2000;

const useAntiCheat = ({ attemptId, enabled, onViolation, onForceSubmit }) => {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isMobile = MOBILE_REGEX.test(userAgent);
  const isIOS = IOS_REGEX.test(userAgent);
  const debounceRef = useRef({
    focus_loss: 0,
    copy_attempt: 0,
  });
  const queuedFailuresRef = useRef([]);
  const isFlushingQueueRef = useRef(false);

  useEffect(() => {
    if (!enabled || !attemptId) {
      return undefined;
    }

    // Mobile notification shade and screen lock both transition the page to hidden.
    // These are treated as legitimate focus-loss violations.

    const getMetadata = (trigger, extra = {}) => ({
      trigger,
      platform: navigator.userAgentData?.platform || navigator.platform || 'unknown',
      userAgent: navigator.userAgent || 'unknown',
      timestamp: new Date().toISOString(),
      ...extra,
    });

    const getCategory = (eventType) => (eventType === 'copy_attempt' ? 'copy_attempt' : 'focus_loss');

    const shouldDebounce = (category) => {
      const now = Date.now();
      const lastTriggeredAt = debounceRef.current[category] || 0;

      if (now - lastTriggeredAt < DEBOUNCE_MS) {
        return true;
      }

      debounceRef.current[category] = now;
      return false;
    };

    const flushQueuedFailures = async () => {
      if (isFlushingQueueRef.current || queuedFailuresRef.current.length === 0) {
        return;
      }

      isFlushingQueueRef.current = true;

      try {
        while (queuedFailuresRef.current.length > 0) {
          const queuedEvent = queuedFailuresRef.current[0];
          const response = await examService.logViolation(
            queuedEvent.attemptId,
            queuedEvent.eventType,
            queuedEvent.metadata,
          );

          if (response.forceSubmitted) {
            queuedFailuresRef.current = [];
            onForceSubmit?.(response);
            break;
          }

          queuedFailuresRef.current.shift();
        }
      } catch {
        // Keep the remaining queued failures for the next successful violation log.
      } finally {
        isFlushingQueueRef.current = false;
      }
    };

    const dispatchViolation = async (eventType, trigger, extraMetadata = {}) => {
      const category = getCategory(eventType);

      if (shouldDebounce(category)) {
        return;
      }

      const metadata = getMetadata(trigger, extraMetadata);

      try {
        const response = await examService.logViolation(attemptId, eventType, metadata);
        await flushQueuedFailures();

        if (response.forceSubmitted) {
          onForceSubmit?.(response);
          return;
        }

        onViolation?.(eventType, response.violationsCount ?? null, false, metadata);
      } catch {
        queuedFailuresRef.current.push({ attemptId, eventType, metadata });
        onViolation?.(eventType, null, false, metadata);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        dispatchViolation('tab_switch', 'visibilitychange');
      }
    };

    const handleWindowBlur = () => {
      window.setTimeout(() => {
        if (document.hasFocus()) {
          return;
        }

        if (isMobile && document.visibilityState !== 'hidden') {
          return;
        }

        dispatchViolation('window_blur', 'blur');
      }, 100);
    };

    const handleCopy = (event) => {
      event.preventDefault();
      dispatchViolation('copy_attempt', 'copy');
    };

    const handleCut = (event) => {
      event.preventDefault();
      dispatchViolation('copy_attempt', 'cut');
    };

    const handleKeyDown = (event) => {
      const key = String(event.key || '').toLowerCase();
      const hasCommandModifier = event.ctrlKey || event.metaKey;

      if (key === 'printscreen') {
        event.preventDefault();
        dispatchViolation('copy_attempt', 'printscreen');
        return;
      }

      if (!hasCommandModifier) {
        return;
      }

      const shortcutTriggers = {
        c: event.metaKey ? 'meta+c' : 'ctrl+c',
        x: event.metaKey ? 'meta+x' : 'ctrl+x',
        a: event.metaKey ? 'meta+a' : 'ctrl+a',
        p: event.metaKey ? 'meta+p' : 'ctrl+p',
      };

      if (shortcutTriggers[key]) {
        event.preventDefault();
        dispatchViolation('copy_attempt', shortcutTriggers[key]);
      }
    };

    const handleContextMenu = (event) => {
      event.preventDefault();
    };

    const handlePageHide = () => {
      dispatchViolation('tab_switch', 'pagehide');
    };

    const handlePageShow = (event) => {
      if (event.persisted) {
        dispatchViolation('tab_switch', 'pageshow-bfcache');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    if (!isIOS) {
      // iOS Safari: window blur unreliable, skip in favor of visibilitychange + pagehide.
      window.addEventListener('blur', handleWindowBlur);
    }

    if (isMobile) {
      window.addEventListener('pagehide', handlePageHide);
      window.addEventListener('pageshow', handlePageShow);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);

      if (!isIOS) {
        window.removeEventListener('blur', handleWindowBlur);
      }

      if (isMobile) {
        window.removeEventListener('pagehide', handlePageHide);
        window.removeEventListener('pageshow', handlePageShow);
      }
    };
  }, [attemptId, enabled, isIOS, isMobile, onForceSubmit, onViolation]);

  return { isMobile };
};

export default useAntiCheat;
