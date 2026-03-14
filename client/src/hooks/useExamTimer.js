import { useEffect, useMemo, useRef, useState } from 'react';

const formatTime = (totalSeconds) => {
  const safeSeconds = Math.max(totalSeconds || 0, 0);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (safeSeconds % 60).toString().padStart(2, '0');

  return `${minutes}:${seconds}`;
};

const useExamTimer = (totalSeconds, onExpire) => {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    typeof totalSeconds === 'number' ? Math.max(totalSeconds, 0) : 0,
  );
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    if (typeof totalSeconds !== 'number') {
      setSecondsLeft(0);
      hasExpiredRef.current = false;
      return;
    }

    setSecondsLeft(Math.max(totalSeconds, 0));
    hasExpiredRef.current = false;
  }, [totalSeconds]);

  useEffect(() => {
    if (typeof totalSeconds !== 'number' || totalSeconds <= 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setSecondsLeft((currentSeconds) => {
        const newSeconds = currentSeconds - 1;

        if (newSeconds <= 0) {
          window.clearInterval(intervalId);

          if (!hasExpiredRef.current) {
            hasExpiredRef.current = true;
            onExpire?.();
          }

          return 0;
        }

        return newSeconds;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [onExpire, totalSeconds]);

  const formattedTime = useMemo(() => formatTime(secondsLeft), [secondsLeft]);

  return {
    secondsLeft,
    isExpired: secondsLeft <= 0,
    formattedTime,
  };
};

export default useExamTimer;
