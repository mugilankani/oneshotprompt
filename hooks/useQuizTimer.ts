
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseQuizTimerProps {
  duration: number;
  onTimeUp: () => void;
  autoStart?: boolean;
}

interface UseQuizTimerReturn {
  timeLeft: number;
  formattedTime: string;
  isRunning: boolean;
  startTimer: () => void;
  resetTimer: (newDuration?: number) => void;
  pauseTimer: () => void;
}

const useQuizTimer = ({ duration, onTimeUp, autoStart = true }: UseQuizTimerProps): UseQuizTimerReturn => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  // Fix: Replaced NodeJS.Timeout with ReturnType<typeof setInterval> for browser environments
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  const clearExistingTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } else if (timeLeft <= 0) {
      clearExistingTimer();
      setIsRunning(false);
      onTimeUpRef.current();
    }
    return () => clearExistingTimer();
  }, [isRunning, timeLeft, clearExistingTimer]);

  const startTimer = useCallback(() => {
    if (!isRunning && timeLeft > 0) { // Only start if not already running and time is left
        setIsRunning(true);
    } else if (timeLeft <= 0) { // If timer was at 0, reset and start
        setTimeLeft(duration);
        setIsRunning(true);
    }
  }, [isRunning, timeLeft, duration]);


  const resetTimer = useCallback((newDuration?: number) => {
    clearExistingTimer();
    setTimeLeft(newDuration ?? duration);
    setIsRunning(autoStart); // Or false if you want manual start after reset
  }, [clearExistingTimer, duration, autoStart]);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    clearExistingTimer();
  }, [clearExistingTimer]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return { timeLeft, formattedTime: formatTime(timeLeft), isRunning, startTimer, resetTimer, pauseTimer };
};

export default useQuizTimer;