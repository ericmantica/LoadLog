export interface WeeklyPlan {
  id: string;
  user_id: string;
  week_start: string;
  status: "active" | "completed" | "skipped";
  created_at: string;
}

export interface UserProfile {
  id: string;
  username: string;
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

export interface WorkoutDayWithLoggedExercises extends WorkoutDay {
  exercises: (Exercise & { logs: LoggedSet[] })[];
}

export interface RecentWorkoutHistoryItem {
  day_id: string;
  muscle_group: string;
  scheduled_date: string;
  logged_at: string;
  total_exercises: number;
  logged_exercises: number;
  completed_exercises: number;
  outcome: "completed" | "partial" | "missed";
}

export interface HistoricalExerciseSession {
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  scheduled_date: string;
  target_sets: number;
  target_reps: number;
  current_weight: number;
  progression_step: number;
  logs: LoggedSet[];
}

export interface Streak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_workout_date: string;
}

export type DashboardSection = "profile" | "activities" | "weekly-plan";

export type InsertUserProfile = Omit<UserProfile, "id" | "created_at">;
export type InsertWeeklyPlan = Omit<WeeklyPlan, "id" | "created_at">;
export type InsertWorkoutDay = Omit<WorkoutDay, "id">;
export type InsertExercise = Omit<Exercise, "id">;
export type InsertLoggedSet = Omit<LoggedSet, "id" | "logged_at">;

export interface PlanGenerationInput {
  user: UserProfile;
  week_start?: string;
  day_numbers?: number[];
  historical_sessions?: HistoricalExerciseSession[];
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
    signUp(username: string, password: string, name: string): Promise<UserProfile>;
    signIn(username: string, password: string): Promise<UserProfile>;
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
    deletePlan(planId: string): Promise<void>;
    getCurrentPlan(userId: string): Promise<WeeklyPlan | null>;
    getPlanWithDetails(planId: string): Promise<PlanWithDetails>;
    replacePlanDays(planId: string, days: PlanGenerationOutput["days"]): Promise<void>;
  };
  workouts: {
    logSet(set: InsertLoggedSet): Promise<LoggedSet>;
    replaceDayLogs(dayId: string, sets: InsertLoggedSet[]): Promise<LoggedSet[]>;
    getExercisesForDay(dayId: string): Promise<Exercise[]>;
    getLogsForExercise(exerciseId: string): Promise<LoggedSet[]>;
    getWorkoutDayHistory(dayId: string): Promise<WorkoutDayWithLoggedExercises>;
    updateWorkoutDayStatus(
      dayId: string,
      status: WorkoutDay["status"]
    ): Promise<WorkoutDay>;
  };
  stats: {
    getStreak(userId: string): Promise<Streak>;
    updateStreak(userId: string): Promise<Streak>;
    getWorkoutHistory(userId: string, limit?: number): Promise<LoggedSet[]>;
    getRecentWorkoutHistory(
      userId: string,
      limit?: number
    ): Promise<RecentWorkoutHistoryItem[]>;
    getHistoricalExerciseSessions(
      userId: string,
      limit?: number
    ): Promise<HistoricalExerciseSession[]>;
  };
}
