export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  fitness_level: FitnessLevel;
  available_days_per_week: number;
  created_at: string;
}

export type InsertUserProfile = Omit<UserProfile, 'id' | 'created_at'>;