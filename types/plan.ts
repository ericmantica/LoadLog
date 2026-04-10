export type PlanStatus = 'active' | 'completed' | 'skipped';
export type WorkoutDayStatus = 'scheduled' | 'completed' | 'partial' | 'missed';

export interface WeeklyPlan {
  id: string;
  user_id: string;
  week_start: string;
  status: PlanStatus;
  created_at: string;
}

export interface WorkoutDay {
  id: string;
  plan_id: string;
  day_number: number;
  muscle_group: string;
  status: WorkoutDayStatus;
  scheduled_date: string;
}

export type InsertWeeklyPlan = Omit<WeeklyPlan, 'id' | 'created_at'>;
export type InsertWorkoutDay = Omit<WorkoutDay, 'id'>;