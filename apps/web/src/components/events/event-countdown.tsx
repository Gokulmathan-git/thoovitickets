'use client';

import { useEffect, useState } from 'react';
import { Clock, AlertTriangle, Ticket, Ban } from 'lucide-react';

interface EventCountdownProps {
  startDate: string;
  saleCutoffDate: string | null;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function getTimeLeft(target: Date): TimeLeft {
  const total = target.getTime() - Date.now();
  if (total <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total,
  };
}

export function EventCountdown({ startDate, saleCutoffDate }: EventCountdownProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const start = new Date(startDate);
  const cutoff = saleCutoffDate ? new Date(saleCutoffDate) : null;
  const hoursToStart = (start.getTime() - now) / (1000 * 60 * 60);
  const eventStarted = now >= start.getTime();

  if (eventStarted) return null;

  const cutoffPassed = cutoff && now >= cutoff.getTime();
  const cutoffSoon = cutoff && !cutoffPassed && (cutoff.getTime() - now) <= 10 * 60 * 60 * 1000;
  const eventSoon = !cutoff && hoursToStart <= 10;

  if (cutoffPassed) {
    return (
      <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
          <Ban className="h-5 w-5" />
          <span className="font-semibold">Ticket Sales Closed</span>
        </div>
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          Ticket sales ended on {cutoff.toLocaleDateString('en-IN', { dateStyle: 'medium' })} at {cutoff.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </p>
        {hoursToStart <= 10 && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Event starts in</p>
            <CountdownDisplay timeLeft={getTimeLeft(start)} variant="muted" />
          </div>
        )}
      </div>
    );
  }

  if (cutoffSoon) {
    const cutoffTimeLeft = getTimeLeft(cutoff);
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Ticket className="h-5 w-5" />
            <span className="font-semibold">Ticket Sales Closing Soon!</span>
          </div>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Hurry! Sales close in</p>
          <CountdownDisplay timeLeft={cutoffTimeLeft} variant="urgent" />
        </div>
        {hoursToStart <= 10 && (
          <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 p-4">
            <div className="flex items-center gap-2 text-orange-700">
              <Clock className="h-5 w-5" />
              <span className="font-semibold">Event Starts In</span>
            </div>
            <CountdownDisplay timeLeft={getTimeLeft(start)} variant="default" />
          </div>
        )}
      </div>
    );
  }

  if (eventSoon) {
    return (
      <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 p-4">
        <div className="flex items-center gap-2 text-orange-700">
          <Clock className="h-5 w-5" />
          <span className="font-semibold">Event Starts In</span>
        </div>
        <CountdownDisplay timeLeft={getTimeLeft(start)} variant="default" />
      </div>
    );
  }

  return null;
}

function CountdownDisplay({ timeLeft, variant }: { timeLeft: TimeLeft; variant: 'default' | 'urgent' | 'muted' }) {
  const colors = {
    default: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300', label: 'text-orange-500' },
    urgent: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-300', label: 'text-amber-500' },
    muted: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-200', label: 'text-gray-400 dark:text-gray-500' },
  }[variant];

  const units = [
    { value: timeLeft.days, label: 'Days' },
    { value: timeLeft.hours, label: 'Hrs' },
    { value: timeLeft.minutes, label: 'Min' },
    { value: timeLeft.seconds, label: 'Sec' },
  ].filter((u) => timeLeft.days > 0 || u.label !== 'Days');

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {units.map((u) => (
        <div key={u.label} className={`flex flex-col items-center rounded-lg ${colors.bg} px-2 sm:px-3 py-2 min-w-11 sm:min-w-12`}>
          <span className={`text-lg font-bold ${colors.text}`}>{String(u.value).padStart(2, '0')}</span>
          <span className={`text-[10px] font-medium uppercase ${colors.label}`}>{u.label}</span>
        </div>
      ))}
    </div>
  );
}
