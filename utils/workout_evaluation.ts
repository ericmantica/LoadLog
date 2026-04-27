import type { Exercise, LoggedSet, WorkoutDay } from '../types';

export type ExerciseOutcome = 'completed' | 'partial' | 'missed';
type ComparableLog = Pick<
  LoggedSet,
  'completed' | 'reps_completed' | 'weight_used'
>;

export function getCompletedPlannedSets(
  exercise: Pick<Exercise, 'target_sets' | 'target_reps' | 'current_weight'>,
  logs: ComparableLog[]
): number {
  let completedSets = 0;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];

    if (
      log.completed &&
      log.reps_completed >= exercise.target_reps &&
      log.weight_used >= exercise.current_weight
    ) {
      completedSets += 1;
    }
  }

  return completedSets;
}

export function getExerciseOutcome(
  exercise: Pick<Exercise, 'target_sets' | 'target_reps' | 'current_weight'>,
  logs: ComparableLog[]
): ExerciseOutcome {
  if (logs.length === 0) {
    return 'missed';
  }

  if (getCompletedPlannedSets(exercise, logs) >= exercise.target_sets) {
    return 'completed';
  }

  return 'partial';
}

export function getWorkoutDayStatus(
  exercises: Array<Pick<Exercise, 'target_sets' | 'target_reps' | 'current_weight'>>,
  logsByExerciseId: Record<string, ComparableLog[]>,
  exerciseIds: string[]
): WorkoutDay['status'] {
  let sawAnyLogs = false;
  let allCompleted = exercises.length > 0;

  for (let i = 0; i < exerciseIds.length; i++) {
    const exerciseId = exerciseIds[i];
    const logs = logsByExerciseId[exerciseId] ?? [];

    if (logs.length > 0) {
      sawAnyLogs = true;
    }

    const outcome = getExerciseOutcome(exercises[i], logs);

    if (outcome !== 'completed') {
      allCompleted = false;
    }
  }

  if (allCompleted) {
    return 'completed';
  }

  if (sawAnyLogs) {
    return 'partial';
  }

  return 'missed';
}
