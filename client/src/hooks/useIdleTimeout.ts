import { useEffect, useRef, useState } from 'react';

interface IdleTimeoutOptions {
  enabled: boolean;
  idleMs: number;
  warningMs: number;
  onTimeout: () => void;
}

export default function useIdleTimeout({
  enabled,
  idleMs,
  warningMs,
  onTimeout,
}: IdleTimeoutOptions) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const resumeRef = useRef<() => void>(() => {});
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    setSecondsLeft(null);
    if (!enabled) return;

    let lastActivityAt = Date.now();
    let warningOpen = false;
    let expired = false;

    const checkDeadline = () => {
      if (expired) return;
      const remaining = idleMs - (Date.now() - lastActivityAt);
      if (remaining <= 0) {
        expired = true;
        setSecondsLeft(null);
        onTimeoutRef.current();
      } else if (remaining <= warningMs) {
        warningOpen = true;
        setSecondsLeft(Math.ceil(remaining / 1000));
      }
    };

    const recordActivity = () => {
      checkDeadline();
      if (expired || warningOpen || document.visibilityState === 'hidden') return;
      const activityAt = Date.now();
      if (activityAt - lastActivityAt < 1000) return;
      lastActivityAt = activityAt;
    };

    resumeRef.current = () => {
      checkDeadline();
      if (expired) return;
      lastActivityAt = Date.now();
      warningOpen = false;
      setSecondsLeft(null);
    };

    const events = ['pointermove', 'pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'];
    events.forEach((event) => window.addEventListener(event, recordActivity, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', checkDeadline);
    window.addEventListener('focus', checkDeadline);
    const interval = window.setInterval(checkDeadline, 1000);
    checkDeadline();

    return () => {
      window.clearInterval(interval);
      events.forEach((event) => window.removeEventListener(event, recordActivity, true));
      document.removeEventListener('visibilitychange', checkDeadline);
      window.removeEventListener('focus', checkDeadline);
      resumeRef.current = () => {};
    };
  }, [enabled, idleMs, warningMs]);

  return {
    isWarning: enabled && secondsLeft !== null,
    secondsLeft: secondsLeft ?? 0,
    stayActive: () => resumeRef.current(),
  };
}