export interface Exercise {
  id: string;
  workout_day_id: string;
  name: string;
  target_sets: number;
  target_reps: number;
  current_weight: number;
  progression_step: number;
}

export interface LoggedSet {
  id: string;
  exercise_id: string;
  set_number: number;
  reps_completed: number;
  weight_used: number;
  completed: boolean;
  logged_at: string;
}

export type InsertExercise = Omit<Exercise, 'id'>;
export type InsertLoggedSet = Omit<LoggedSet, 'id' | 'logged_at'>;