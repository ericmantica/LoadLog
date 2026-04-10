import { useEffect, useState } from "react";
import type {
  UserProfile,
  LoadLogAPI,
  PlanWithDetails,
  LoggedSet,
  Exercise,
  Streak,
  InsertLoggedSet
} from "./types";
import { generatePlan } from "./planner";
import {
  loadExistingPlanForUser,
  generatePlanIfNeeded,
  regeneratePlan
} from "./planFlow";

import WeeklyPlanView from "./PlanView";

const mockUser: UserProfile = {
  id: "user-1",
  email: "test@example.com",
  display_name: "Alice",
  fitness_level: "beginner",
  available_days_per_week: 3,
  created_at: "2025-01-01"
};

function buildMockPlanWithDetails(planId: string): PlanWithDetails {
  const generated = generatePlan({
    user: mockUser,
    previousPlan: undefined
  });

  return {
    id: planId,
    user_id: generated.plan.user_id,
    week_start: generated.plan.week_start,
    status: generated.plan.status,
    created_at: new Date().toISOString(),
    days: generated.days.map((day, dayIndex) => {
      return {
        id: "day-" + String(dayIndex + 1),
        plan_id: planId,
        day_number: day.day_number,
        muscle_group: day.muscle_group,
        status: day.status,
        scheduled_date: day.scheduled_date,
        exercises: day.exercises.map((exercise, exerciseIndex) => {
          return {
            id: "exercise-" + String(dayIndex + 1) + "-" + String(exerciseIndex + 1),
            workout_day_id: "day-" + String(dayIndex + 1),
            name: exercise.name,
            target_sets: exercise.target_sets,
            target_reps: exercise.target_reps,
            current_weight: exercise.current_weight,
            progression_step: exercise.progression_step
          };
        })
      };
    })
  };
}

const mockApi: LoadLogAPI = {
  auth: {
    async signUp(email: string, password: string, name: string) {
      return {
        id: "user-1",
        email: email,
        display_name: name,
        fitness_level: "beginner",
        available_days_per_week: 3,
        created_at: new Date().toISOString()
      };
    },

    async signIn(email: string, password: string) {
      return {
        id: "user-1",
        email: email,
        display_name: "Alice",
        fitness_level: "beginner",
        available_days_per_week: 3,
        created_at: "2025-01-01"
      };
    },

    async signOut() {
      return;
    },

    async getSession() {
      return mockUser;
    }
  },

  users: {
    async getProfile(userId: string) {
      return mockUser;
    },

    async updateProfile(
      userId: string,
      updates: Partial<UserProfile>
    ) {
      return {
        ...mockUser,
        ...updates,
        id: mockUser.id,
        created_at: mockUser.created_at
      };
    }
  },

  plans: {
    async createPlan(input) {
      return {
        id: "mock-plan-id",
        user_id: input.plan.user_id,
        week_start: input.plan.week_start,
        status: input.plan.status,
        created_at: new Date().toISOString()
      };
    },

    async getCurrentPlan(userId: string) {
      return null;
    },

    async getPlanWithDetails(planId: string) {
      return buildMockPlanWithDetails(planId);
    }
  },

  workouts: {
    async logSet(set: InsertLoggedSet): Promise<LoggedSet> {
      return {
        id: "mock-log-1",
        exercise_id: set.exercise_id,
        set_number: set.set_number,
        reps_completed: set.reps_completed,
        weight_used: set.weight_used,
        completed: set.completed,
        logged_at: new Date().toISOString()
      };
    },

    async getExercisesForDay(dayId: string): Promise<Exercise[]> {
      const plan = buildMockPlanWithDetails("mock-plan-id");

      for (let i = 0; i < plan.days.length; i++) {
        if (plan.days[i].id === dayId) {
          return plan.days[i].exercises.map((exercise) => {
            return {
              id: exercise.id,
              workout_day_id: exercise.workout_day_id,
              name: exercise.name,
              target_sets: exercise.target_sets,
              target_reps: exercise.target_reps,
              current_weight: exercise.current_weight,
              progression_step: exercise.progression_step
            };
          });
        }
      }

      return [];
    },

    async getLogsForExercise(exerciseId: string): Promise<LoggedSet[]> {
      return [];
    }
  },

  stats: {
    async getStreak(userId: string): Promise<Streak> {
      return {
        id: "streak-1",
        user_id: userId,
        current_streak: 0,
        longest_streak: 0,
        last_workout_date: ""
      };
    },

    async updateStreak(userId: string): Promise<Streak> {
      return {
        id: "streak-1",
        user_id: userId,
        current_streak: 0,
        longest_streak: 0,
        last_workout_date: ""
      };
    },

    async getWorkoutHistory(
      userId: string,
      limit?: number
    ): Promise<LoggedSet[]> {
      return [];
    }
  }
};

function FirstTry() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [planOutput, setPlanOutput] = useState<PlanWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInitialData() {
      setInitialLoading(true);
      setError("");
      setMessage("");

      try {
        const profile = await mockApi.users.getProfile("user-1");
        setUser(profile);

        const existingPlan = await loadExistingPlanForUser(mockApi, profile.id);

        if (existingPlan) {
          setPlanOutput(existingPlan);
          setMessage("Loaded existing plan from database.");
        }
      } catch (err) {
        setError("Failed to load user or existing plan.");
      } finally {
        setInitialLoading(false);
      }
    }

    loadInitialData();
  }, []);

  async function handleGenerate() {
    if (!user) {
      setError("User not loaded.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await generatePlanIfNeeded(mockApi, user);
      setPlanOutput(result.plan);

      if (result.createdNew) {
        setMessage("New plan generated and saved.");
      } else {
        setMessage("This week already has a plan. Showing the existing plan.");
      }
    } catch (err) {
      setError("Failed to generate plan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    if (!user) {
      setError("User not loaded.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const fullPlan = await regeneratePlan(mockApi, user);
      setPlanOutput(fullPlan);
      setMessage("Plan regenerated successfully.");
    } catch (err) {
      setError("Failed to regenerate plan.");
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <div style={{ padding: "20px", fontSize: "18px" }}>
        Loading...
      </div>
    );
  }

  return (
    <WeeklyPlanView
      user={user}
      plan={planOutput}
      loading={loading}
      message={message}
      error={error}
      onGenerate={handleGenerate}
      onRegenerate={handleRegenerate}
    />
  );
}

export default FirstTry;