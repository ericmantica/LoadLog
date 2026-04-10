export interface WeeklyPlan {
  id: string;
  user_id: string;
  week_start: string;
  status: "active" | "completed" | "skipped";
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  fitness_level: "beginner" | "intermediate" | "advanced";
  available_days_per_week: number;
  created_at: string;
}

export interface WorkoutDay {
  id: string;
  plan_id: string;
  day_number: number;
  muscle_group: string;
  status: "scheduled" | "completed" | "partial" | "missed";
  scheduled_date: string;
}

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

export interface Streak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_workout_date: string;
}

export type InsertUserProfile = Omit<UserProfile, "id" | "created_at">;
export type InsertWeeklyPlan = Omit<WeeklyPlan, "id" | "created_at">;
export type InsertWorkoutDay = Omit<WorkoutDay, "id">;
export type InsertExercise = Omit<Exercise, "id">;
export type InsertLoggedSet = Omit<LoggedSet, "id" | "logged_at">;

export interface PlanGenerationInput {
  user: UserProfile;
  previousPlan?: WeeklyPlan & {
    days: (WorkoutDay & {
      exercises: (Exercise & { logs: LoggedSet[] })[];
    })[];
  };
}

export interface PlanGenerationOutput {
  plan: InsertWeeklyPlan;
  days: (InsertWorkoutDay & {
    exercises: InsertExercise[];
  })[];
}

export interface PlanWithDetails extends WeeklyPlan {
  days: (WorkoutDay & {
    exercises: (Exercise & { logs?: LoggedSet[] })[];
  })[];
}

export interface LoadLogAPI {
  auth: {
    signUp(email: string, password: string, name: string): Promise<UserProfile>;
    signIn(email: string, password: string): Promise<UserProfile>;
    signOut(): Promise<void>;
    getSession(): Promise<UserProfile | null>;
  };
  users: {
    getProfile(userId: string): Promise<UserProfile>;
    updateProfile(
      userId: string,
      updates: Partial<UserProfile>
    ): Promise<UserProfile>;
  };
  plans: {
    createPlan(input: PlanGenerationOutput): Promise<WeeklyPlan>;
    getCurrentPlan(userId: string): Promise<WeeklyPlan | null>;
    getPlanWithDetails(planId: string): Promise<PlanWithDetails>;
  };
  workouts: {
    logSet(set: InsertLoggedSet): Promise<LoggedSet>;
    getExercisesForDay(dayId: string): Promise<Exercise[]>;
    getLogsForExercise(exerciseId: string): Promise<LoggedSet[]>;
  };
  stats: {
    getStreak(userId: string): Promise<Streak>;
    updateStreak(userId: string): Promise<Streak>;
    getWorkoutHistory(userId: string, limit?: number): Promise<LoggedSet[]>;
  };
}