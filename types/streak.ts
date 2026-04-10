interface Streak {
  id: string;                    // UUID
  user_id: string;               // FK → UserProfile.id
  current_streak: number;        // consecutive workout days
  longest_streak: number;
  last_workout_date: string;     // ISO date
}
