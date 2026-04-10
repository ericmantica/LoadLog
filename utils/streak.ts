import type { LoggedSet } from '@/types';

export interface StreakCalculationResult {
  current_streak: number;
  longest_streak: number;
  last_workout_date: string | null;
}

/**
 * Convert an ISO timestamp to YYYY-MM-DD.
 * Example: "2026-04-02T18:30:00Z" -> "2026-04-02"
 */
function toIsoDate(timestamp: string): string {
  return timestamp.slice(0, 10);
}

/**
 * Returns the whole-day difference between two ISO dates (YYYY-MM-DD).
 * Positive if dateB is after dateA.
 */
function diffDays(dateA: string, dateB: string): number {
  const a = new Date(`${dateA}T00:00:00Z`);
  const b = new Date(`${dateB}T00:00:00Z`);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

/**
 * Returns today's date in YYYY-MM-DD (UTC-based for consistency).
 */
function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Calculate streak statistics from raw logged sets.
 *
 * Rules:
 * - Only completed logs count.
 * - Multiple logs on the same date count as one workout day.
 * - current_streak counts consecutive workout days ending at the most recent
 *   workout date, but only if that date is today or yesterday.
 * - longest_streak is the maximum consecutive-day run in the data.
 */
export function calculateStreak(
  logs: LoggedSet[],
  today: string = getTodayIsoDate()
): StreakCalculationResult {
  const completedLogs = logs.filter((log) => log.completed);

  if (completedLogs.length === 0) {
    return {
      current_streak: 0,
      longest_streak: 0,
      last_workout_date: null,
    };
  }

  const uniqueDates = Array.from(
    new Set(completedLogs.map((log) => toIsoDate(log.logged_at)))
  ).sort();

  const lastWorkoutDate = uniqueDates[uniqueDates.length - 1];

  let longestStreak = 1;
  let runningStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const gap = diffDays(uniqueDates[i - 1], uniqueDates[i]);

    if (gap === 1) {
      runningStreak += 1;
    } else {
      runningStreak = 1;
    }

    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
  }

  let currentStreak = 0;
  const daysSinceLastWorkout = diffDays(lastWorkoutDate, today);

  // Only keep current streak alive if user worked out today or yesterday.
  if (daysSinceLastWorkout === 0 || daysSinceLastWorkout === 1) {
    currentStreak = 1;

    for (let i = uniqueDates.length - 1; i > 0; i--) {
      const gap = diffDays(uniqueDates[i - 1], uniqueDates[i]);

      if (gap === 1) {
        currentStreak += 1;
      } else {
        break;
      }
    }
  }

  return {
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_workout_date: lastWorkoutDate,
  };
}