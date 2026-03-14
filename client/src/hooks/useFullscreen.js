import { useEffect, useRef, useState } from 'react';

const MOBILE_REGEX = /iPhone|iPad|iPod|Android/i;
const IOS_REGEX = /iPhone|iPad|iPod/i;

export function useFullscreen() {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isMobile = MOBILE_REGEX.test(userAgent);
  const isIOS = IOS_REGEX.test(userAgent);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(!isIOS);
  const pseudoStateRef = useRef(null);

  useEffect(() => {
    const root = document.documentElement;

    if (isIOS) {
      setIsSupported(false);
      setIsFullscreen(Boolean(pseudoStateRef.current));
      return undefined;
    }

    setIsSupported(Boolean(root.requestFullscreen || root.webkitRequestFullscreen));

    const handleChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    };

    handleChange();
    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('webkitfullscreenchange', handleChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
    };
  }, [isIOS]);

  useEffect(() => () => {
    if (pseudoStateRef.current) {
      const { target, styles } = pseudoStateRef.current;
      Object.assign(target.style, styles);
      pseudoStateRef.current = null;
    }
  }, []);

  const enter = async () => {
    if (isIOS) {
      if (!pseudoStateRef.current) {
        const target = document.body;
        pseudoStateRef.current = {
          target,
          styles: {
            position: target.style.position,
            top: target.style.top,
            left: target.style.left,
            width: target.style.width,
            height: target.style.height,
            zIndex: target.style.zIndex,
            overflow: target.style.overflow,
          },
        };
      }

      Object.assign(pseudoStateRef.current.target.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100dvh',
        zIndex: '9999',
        overflow: 'hidden',
      });
      setIsFullscreen(true);
      return;
    }

    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      }
    } catch {
      // Browser blocked fullscreen. Caller handles the unchanged state.
    }
  };

  const exit = async () => {
    if (isIOS) {
      if (pseudoStateRef.current) {
        const { target, styles } = pseudoStateRef.current;
        Object.assign(target.style, styles);
        pseudoStateRef.current = null;
      }
      setIsFullscreen(false);
      return;
    }

    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      }
    } catch {
      // Ignore exit failures.
    }
  };

  return { isFullscreen, isSupported, enter, exit, isMobile, isIOS };
}

export default useFullscreen;
