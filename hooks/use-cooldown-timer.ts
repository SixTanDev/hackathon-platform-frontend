import { useState, useEffect, useCallback, useRef } from 'react';

export interface CooldownTimerResult {
  /** Seconds remaining until cooldown ends */
  secondsLeft: number;
  /** Whether the cooldown is currently active */
  isActive: boolean;
  /** Formatted string: "28s" or "1m 05s" */
  formatted: string;
  /** Start a cooldown from an ISO datetime */
  start: (nextAvailableAt: string) => void;
  /** Force-clear the cooldown */
  clear: () => void;
}

export function useCooldownTimer(): CooldownTimerResult {
  const [targetTime, setTargetTime] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const calcRemaining = useCallback(() => {
    if (targetTime == null) return 0;
    return Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
  }, [targetTime]);

  useEffect(() => {
    if (targetTime == null) {
      setSecondsLeft(0);
      return;
    }

    setSecondsLeft(calcRemaining());

    intervalRef.current = setInterval(() => {
      const remaining = calcRemaining();
      setSecondsLeft(remaining);
      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setTargetTime(null);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [targetTime, calcRemaining]);

  const start = useCallback((nextAvailableAt: string) => {
    const ts = new Date(nextAvailableAt).getTime();
    if (isNaN(ts)) return;
    setTargetTime(ts);
  }, []);

  const clear = useCallback(() => {
    setTargetTime(null);
    setSecondsLeft(0);
  }, []);

  const isActive = secondsLeft > 0;

  const formatted = (() => {
    if (!isActive) return '';
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
    return `${s}s`;
  })();

  return { secondsLeft, isActive, formatted, start, clear };
}
