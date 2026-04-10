import type { LoggedSet } from '../types';
import { calculateStreak } from '../utils/streak';

function makeLog(id: string, loggedAt: string, completed = true): LoggedSet {
  return {
    id,
    exercise_id: 'exercise-1',
    set_number: 1,
    reps_completed: 8,
    weight_used: 100,
    completed,
    logged_at: loggedAt,
  };
}

function runCase(
  name: string,
  logs: LoggedSet[],
  today: string,
  expected: {
    current_streak: number;
    longest_streak: number;
    last_workout_date: string | null;
  }
): void {
  const actual = calculateStreak(logs, today);

  const passed =
    actual.current_streak === expected.current_streak &&
    actual.longest_streak === expected.longest_streak &&
    actual.last_workout_date === expected.last_workout_date;

  console.log(`\n=== ${name} ===`);
  console.log('actual  :', actual);
  console.log('expected:', expected);
  console.log(passed ? 'PASS' : 'FAIL');
}

runCase(
  'returns zeros for empty logs',
  [],
  '2026-04-03',
  {
    current_streak: 0,
    longest_streak: 0,
    last_workout_date: null,
  }
);

runCase(
  'counts multiple logs on the same day as one workout day',
  [
    makeLog('1', '2026-04-01T10:00:00Z'),
    makeLog('2', '2026-04-01T11:00:00Z'),
    makeLog('3', '2026-04-02T10:00:00Z'),
  ],
  '2026-04-02',
  {
    current_streak: 2,
    longest_streak: 2,
    last_workout_date: '2026-04-02',
  }
);

runCase(
  'calculates longest streak correctly when there is a break',
  [
    makeLog('1', '2026-04-01T10:00:00Z'),
    makeLog('2', '2026-04-02T10:00:00Z'),
    makeLog('3', '2026-04-04T10:00:00Z'),
    makeLog('4', '2026-04-05T10:00:00Z'),
    makeLog('5', '2026-04-06T10:00:00Z'),
  ],
  '2026-04-06',
  {
    current_streak: 3,
    longest_streak: 3,
    last_workout_date: '2026-04-06',
  }
);

runCase(
  'resets current streak if last workout was too long ago',
  [
    makeLog('1', '2026-04-01T10:00:00Z'),
    makeLog('2', '2026-04-02T10:00:00Z'),
  ],
  '2026-04-05',
  {
    current_streak: 0,
    longest_streak: 2,
    last_workout_date: '2026-04-02',
  }
);

runCase(
  'ignores incomplete logs',
  [
    makeLog('1', '2026-04-01T10:00:00Z', false),
    makeLog('2', '2026-04-02T10:00:00Z', true),
  ],
  '2026-04-02',
  {
    current_streak: 1,
    longest_streak: 1,
    last_workout_date: '2026-04-02',
  }
);

runCase(
  'handles logs in unsorted order',
  [
    makeLog('1', '2026-04-03T10:00:00Z'),
    makeLog('2', '2026-04-01T10:00:00Z'),
    makeLog('3', '2026-04-02T10:00:00Z'),
  ],
  '2026-04-03',
  {
    current_streak: 3,
    longest_streak: 3,
    last_workout_date: '2026-04-03',
  }
);

runCase(
  'keeps current streak alive if last workout was yesterday',
  [
    makeLog('1', '2026-04-01T10:00:00Z'),
    makeLog('2', '2026-04-02T10:00:00Z'),
    makeLog('3', '2026-04-03T10:00:00Z'),
  ],
  '2026-04-04',
  {
    current_streak: 3,
    longest_streak: 3,
    last_workout_date: '2026-04-03',
  }
);