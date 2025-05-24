
import React from 'react';

interface ProgressBarProps {
  duration: number;
  timeLeft: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ duration, timeLeft }) => {
  const percentage = duration > 0 ? Math.max(0, Math.min(100, (timeLeft / duration) * 100)) : 0;
  let barColor = 'bg-sky-500'; // Default: Sky blue for good time left

  if (percentage < 50 && percentage >= 25) {
    barColor = 'bg-yellow-500'; // Yellow for medium time
  } else if (percentage < 25) {
    barColor = 'bg-red-500'; // Red for low time
  }

  return (
    <div className="w-full bg-slate-200 rounded-full h-3 md:h-4 shadow-inner overflow-hidden border border-slate-300">
      <div
        className={`h-full rounded-full ${barColor} transition-all duration-1000 ease-linear`}
        style={{ width: `${percentage}%` }}
        role="progressbar"
        aria-valuenow={timeLeft}
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-label={`Time left: ${timeLeft} seconds`}
      />
    </div>
  );
};

export default ProgressBar;
