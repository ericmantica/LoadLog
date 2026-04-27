import type {
  Exercise,
  HistoricalExerciseSession,
  InsertLoggedSet,
  LoadLogAPI,
  LoggedSet,
  PlanGenerationOutput,
  PlanWithDetails,
  RecentWorkoutHistoryItem,
  Streak,
  UserProfile,
  WeeklyPlan,
  WorkoutDay,
  WorkoutDayWithLoggedExercises,
} from "../types";
import { calculateStreak } from "../utils/streak_calculation";
import {
  getExerciseOutcome,
} from "../utils/workout_evaluation";
import { supabase } from "./supabase";

const DEFAULT_FITNESS_LEVEL: UserProfile["fitness_level"] = "beginner";
const DEFAULT_DAYS_PER_WEEK = 3;
const INTERNAL_AUTH_DOMAIN = "loadlog.app";
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const USERNAME_ONLY_AUTH_SETUP_MESSAGE =
  "Username-only signup requires Supabase email confirmation to be turned off. In Supabase, go to Authentication -> Sign In / Providers -> Email and disable Confirm email.";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function defaultProfile(authUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Omit<UserProfile, "created_at"> {
  const displayName =
    typeof authUser.user_metadata?.display_name === "string"
      ? authUser.user_metadata.display_name
      : "User";

  const username =
    typeof authUser.user_metadata?.username === "string"
      ? authUser.user_metadata.username
      : getUsernameFromEmail(authUser.email ?? "");

  return {
    id: authUser.id,
    username,
    email: authUser.email ?? "",
    display_name: displayName,
    fitness_level: DEFAULT_FITNESS_LEVEL,
    available_days_per_week: DEFAULT_DAYS_PER_WEEK,
  };
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function validateUsername(username: string): string {
  const normalizedUsername = normalizeUsername(username);

  if (!USERNAME_PATTERN.test(normalizedUsername)) {
    throw new Error(
      "Username must be 3-20 characters and use only lowercase letters, numbers, or underscores."
    );
  }

  return normalizedUsername;
}

function buildInternalEmail(username: string): string {
  return `${normalizeUsername(username)}@${INTERNAL_AUTH_DOMAIN}`;
}

function mapAuthError(error: unknown): Error {
  const message = getErrorMessage(error, "Authentication failed.");
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("rate limit")) {
    return new Error(
      "Signup is blocked by Supabase's email sender rate limit. This app uses username-only auth, so disable Confirm email in Supabase Auth settings and try again."
    );
  }

  if (normalizedMessage.includes("already registered")) {
    return new Error("That username is already taken.");
  }

  if (normalizedMessage.includes("invalid login credentials")) {
    return new Error("Incorrect username or password.");
  }

  return new Error(message);
}

function getUsernameFromEmail(email: string): string {
  const atIndex = email.indexOf("@");

  if (atIndex === -1) {
    return normalizeUsername(email);
  }

  return normalizeUsername(email.slice(0, atIndex));
}

async function ensureProfile(authUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Promise<UserProfile> {
  const { data: existingProfile, error: fetchError } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (existingProfile) {
    if (!existingProfile.username) {
      const fallbackUsername =
        typeof authUser.user_metadata?.username === "string"
          ? authUser.user_metadata.username
          : getUsernameFromEmail(existingProfile.email ?? authUser.email ?? "");

      const { data: updatedProfile, error: updateError } = await supabase
        .from("users")
        .update({ username: fallbackUsername })
        .eq("id", authUser.id)
        .select("*")
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      return updatedProfile as UserProfile;
    }

    return existingProfile as UserProfile;
  }

  const profileToCreate = defaultProfile(authUser);

  const { data: createdProfile, error: createError } = await supabase
    .from("users")
    .insert(profileToCreate)
    .select("*")
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return createdProfile as UserProfile;
}

async function fetchPlanWithDetails(planId: string): Promise<PlanWithDetails> {
  const { data: plan, error: planError } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (planError) {
    throw new Error(planError.message);
  }

  const { data: days, error: daysError } = await supabase
    .from("workout_days")
    .select("*")
    .eq("plan_id", planId)
    .order("day_number", { ascending: true });

  if (daysError) {
    throw new Error(daysError.message);
  }

  if (!days || days.length === 0) {
    return {
      ...(plan as WeeklyPlan),
      days: [],
    };
  }

  const dayIds = days.map((day) => day.id);

  const { data: exercises, error: exercisesError } = await supabase
    .from("exercises")
    .select("*")
    .in("workout_day_id", dayIds);

  if (exercisesError) {
    throw new Error(exercisesError.message);
  }

  const exercisesByDayId: Record<string, Exercise[]> = {};

  for (let i = 0; i < dayIds.length; i++) {
    exercisesByDayId[dayIds[i]] = [];
  }

  const typedExercises = (exercises as Exercise[] | null) ?? [];
  const exerciseIds = typedExercises.map((exercise) => exercise.id);
  const logsByExerciseId: Record<string, LoggedSet[]> = {};

  if (exerciseIds.length > 0) {
    const { data: logs, error: logsError } = await supabase
      .from("logged_sets")
      .select("*")
      .in("exercise_id", exerciseIds)
      .order("logged_at", { ascending: true })
      .order("set_number", { ascending: true });

    if (logsError) {
      throw new Error(logsError.message);
    }

    const typedLogs = (logs as LoggedSet[] | null) ?? [];

    for (let i = 0; i < typedLogs.length; i++) {
      const log = typedLogs[i];

      if (!logsByExerciseId[log.exercise_id]) {
        logsByExerciseId[log.exercise_id] = [];
      }

      logsByExerciseId[log.exercise_id].push(log);
    }
  }

  if (typedExercises.length > 0) {
    for (let i = 0; i < typedExercises.length; i++) {
      const exercise = typedExercises[i] as Exercise & { logs?: LoggedSet[] };
      if (!exercisesByDayId[exercise.workout_day_id]) {
        exercisesByDayId[exercise.workout_day_id] = [];
      }
      exercise.logs = logsByExerciseId[exercise.id] ?? [];
      exercisesByDayId[exercise.workout_day_id].push(exercise);
    }
  }

  const daysWithExercises = days.map((day) => ({
    ...day,
    exercises: exercisesByDayId[day.id] ?? [],
  }));

  return {
    ...(plan as WeeklyPlan),
    days: daysWithExercises,
  };
}

async function fetchWorkoutDayHistory(
  dayId: string
): Promise<WorkoutDayWithLoggedExercises> {
  const { data: day, error: dayError } = await supabase
    .from("workout_days")
    .select("*")
    .eq("id", dayId)
    .single();

  if (dayError) {
    throw new Error(dayError.message);
  }

  const { data: exercises, error: exercisesError } = await supabase
    .from("exercises")
    .select("*")
    .eq("workout_day_id", dayId);

  if (exercisesError) {
    throw new Error(exercisesError.message);
  }

  const typedExercises = (exercises as Exercise[] | null) ?? [];
  const exerciseIds = typedExercises.map((exercise) => exercise.id);
  const logsByExerciseId: Record<string, LoggedSet[]> = {};

  if (exerciseIds.length > 0) {
    const { data: logs, error: logsError } = await supabase
      .from("logged_sets")
      .select("*")
      .in("exercise_id", exerciseIds)
      .order("set_number", { ascending: true })
      .order("logged_at", { ascending: true });

    if (logsError) {
      throw new Error(logsError.message);
    }

    const typedLogs = (logs as LoggedSet[] | null) ?? [];

    for (let i = 0; i < typedLogs.length; i++) {
      const log = typedLogs[i];

      if (!logsByExerciseId[log.exercise_id]) {
        logsByExerciseId[log.exercise_id] = [];
      }

      logsByExerciseId[log.exercise_id].push(log);
    }
  }

  return {
    ...(day as WorkoutDay),
    exercises: typedExercises.map((exercise) => ({
      ...exercise,
      logs: logsByExerciseId[exercise.id] ?? [],
    })),
  };
}

async function fetchHistoricalExerciseSessionsForUser(
  userId: string,
  limit?: number
): Promise<HistoricalExerciseSession[]> {
  const { data: userPlans, error: plansError } = await supabase
    .from("weekly_plans")
    .select("id")
    .eq("user_id", userId);

  if (plansError) {
    throw new Error(plansError.message);
  }

  if (!userPlans || userPlans.length === 0) {
    return [];
  }

  const planIds = userPlans.map((plan) => plan.id);

  const { data: planDays, error: daysError } = await supabase
    .from("workout_days")
    .select("*")
    .in("plan_id", planIds)
    .order("scheduled_date", { ascending: false })
    .order("day_number", { ascending: false });

  if (daysError) {
    throw new Error(daysError.message);
  }

  if (!planDays || planDays.length === 0) {
    return [];
  }

  const dayIds = planDays.map((day) => day.id);
  const dayById = new Map(planDays.map((day) => [day.id, day]));

  const { data: exercises, error: exercisesError } = await supabase
    .from("exercises")
    .select("*")
    .in("workout_day_id", dayIds);

  if (exercisesError) {
    throw new Error(exercisesError.message);
  }

  if (!exercises || exercises.length === 0) {
    return [];
  }

  const typedExercises = exercises as Exercise[];
  const exerciseIds = typedExercises.map((exercise) => exercise.id);

  const { data: logs, error: logsError } = await supabase
    .from("logged_sets")
    .select("*")
    .in("exercise_id", exerciseIds)
    .order("logged_at", { ascending: true })
    .order("set_number", { ascending: true });

  if (logsError) {
    throw new Error(logsError.message);
  }

  const logsByExerciseId: Record<string, LoggedSet[]> = {};
  const typedLogs = (logs as LoggedSet[] | null) ?? [];

  for (let i = 0; i < typedLogs.length; i++) {
    const log = typedLogs[i];

    if (!logsByExerciseId[log.exercise_id]) {
      logsByExerciseId[log.exercise_id] = [];
    }

    logsByExerciseId[log.exercise_id].push(log);
  }

  const sessions: HistoricalExerciseSession[] = typedExercises.map((exercise) => {
    const day = dayById.get(exercise.workout_day_id);

    return {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      muscle_group: day?.muscle_group ?? "",
      scheduled_date: day?.scheduled_date ?? "",
      target_sets: exercise.target_sets,
      target_reps: exercise.target_reps,
      current_weight: exercise.current_weight,
      progression_step: exercise.progression_step,
      logs: logsByExerciseId[exercise.id] ?? [],
    };
  });

  sessions.sort((a, b) => {
    if (a.scheduled_date === b.scheduled_date) {
      return b.exercise_name.localeCompare(a.exercise_name);
    }

    return b.scheduled_date.localeCompare(a.scheduled_date);
  });

  if (typeof limit === "number") {
    return sessions.slice(0, limit);
  }

  return sessions;
}

async function fetchRecentWorkoutHistoryForUser(
  userId: string,
  limit: number = 5
): Promise<RecentWorkoutHistoryItem[]> {
  const { data: userPlans, error: plansError } = await supabase
    .from("weekly_plans")
    .select("id")
    .eq("user_id", userId);

  if (plansError) {
    throw new Error(plansError.message);
  }

  if (!userPlans || userPlans.length === 0) {
    return [];
  }

  const planIds = userPlans.map((plan) => plan.id);

  const { data: planDays, error: daysError } = await supabase
    .from("workout_days")
    .select("id, muscle_group, scheduled_date")
    .in("plan_id", planIds);

  if (daysError) {
    throw new Error(daysError.message);
  }

  if (!planDays || planDays.length === 0) {
    return [];
  }

  const dayIds = planDays.map((day) => day.id);
  const dayById = new Map(planDays.map((day) => [day.id, day]));

  const { data: exercises, error: exercisesError } = await supabase
    .from("exercises")
    .select("*")
    .in("workout_day_id", dayIds);

  if (exercisesError) {
    throw new Error(exercisesError.message);
  }

  const typedExercises = (exercises as Exercise[] | null) ?? [];

  if (typedExercises.length === 0) {
    return [];
  }

  const exerciseIds = typedExercises.map((exercise) => exercise.id);
  const exerciseById = new Map(typedExercises.map((exercise) => [exercise.id, exercise]));
  const totalExercisesByDayId: Record<string, number> = {};

  for (let i = 0; i < typedExercises.length; i++) {
    const exercise = typedExercises[i];
    totalExercisesByDayId[exercise.workout_day_id] =
      (totalExercisesByDayId[exercise.workout_day_id] ?? 0) + 1;
  }

  const { data: logs, error: logsError } = await supabase
    .from("logged_sets")
    .select("*")
    .in("exercise_id", exerciseIds)
    .order("logged_at", { ascending: false });

  if (logsError) {
    throw new Error(logsError.message);
  }

  const typedLogs = (logs as LoggedSet[] | null) ?? [];

  if (typedLogs.length === 0) {
    return [];
  }

  const logsByExerciseId: Record<string, LoggedSet[]> = {};

  for (let i = 0; i < typedLogs.length; i++) {
    const log = typedLogs[i];

    if (!logsByExerciseId[log.exercise_id]) {
      logsByExerciseId[log.exercise_id] = [];
    }

    logsByExerciseId[log.exercise_id].push(log);
  }

  const entriesByDayId: Record<string, RecentWorkoutHistoryItem> = {};

  const exerciseEntries = Object.keys(logsByExerciseId);

  for (let i = 0; i < exerciseEntries.length; i++) {
    const exerciseId = exerciseEntries[i];
    const exercise = exerciseById.get(exerciseId);

    if (!exercise) {
      continue;
    }

    const day = dayById.get(exercise.workout_day_id);

    if (!day) {
      continue;
    }

    const exerciseLogs = logsByExerciseId[exerciseId];

    if (exerciseLogs.length === 0) {
      continue;
    }

    const outcome = getExerciseOutcome(exercise, exerciseLogs);
    const latestLoggedAt = exerciseLogs[0]?.logged_at ?? "";

    if (!entriesByDayId[day.id]) {
      entriesByDayId[day.id] = {
        day_id: day.id,
        muscle_group: day.muscle_group,
        scheduled_date: day.scheduled_date,
        logged_at: latestLoggedAt,
        total_exercises: totalExercisesByDayId[day.id] ?? 0,
        logged_exercises: 0,
        completed_exercises: 0,
        outcome: "missed",
      };
    }

    const entry = entriesByDayId[day.id];
    entry.logged_exercises += 1;

    if (latestLoggedAt > entry.logged_at) {
      entry.logged_at = latestLoggedAt;
    }

    if (outcome === "completed") {
      entry.completed_exercises += 1;
    }
  }

  const entries = Object.values(entriesByDayId).map((entry) => {
    if (entry.completed_exercises === entry.total_exercises) {
      entry.outcome = "completed";
    } else if (entry.logged_exercises > 0) {
      entry.outcome = "partial";
    } else {
      entry.outcome = "missed";
    }

    return entry;
  });

  entries.sort((a, b) => b.logged_at.localeCompare(a.logged_at));

  return entries.slice(0, limit);
}

async function fetchWorkoutHistoryForUser(
  userId: string,
  limit?: number
): Promise<LoggedSet[]> {
  const { data: userPlans, error: plansError } = await supabase
    .from("weekly_plans")
    .select("id")
    .eq("user_id", userId);

  if (plansError) {
    throw new Error(plansError.message);
  }

  if (!userPlans || userPlans.length === 0) {
    return [];
  }

  const planIds = userPlans.map((plan) => plan.id);

  const { data: planDays, error: daysError } = await supabase
    .from("workout_days")
    .select("id")
    .in("plan_id", planIds);

  if (daysError) {
    throw new Error(daysError.message);
  }

  if (!planDays || planDays.length === 0) {
    return [];
  }

  const dayIds = planDays.map((day) => day.id);

  const { data: dayExercises, error: exercisesError } = await supabase
    .from("exercises")
    .select("id")
    .in("workout_day_id", dayIds);

  if (exercisesError) {
    throw new Error(exercisesError.message);
  }

  if (!dayExercises || dayExercises.length === 0) {
    return [];
  }

  const exerciseIds = dayExercises.map((exercise) => exercise.id);

  let query = supabase
    .from("logged_sets")
    .select("*")
    .in("exercise_id", exerciseIds)
    .order("logged_at", { ascending: false });

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data: logs, error: logsError } = await query;

  if (logsError) {
    throw new Error(logsError.message);
  }

  return (logs as LoggedSet[]) ?? [];
}

export const loadLogApi: LoadLogAPI = {
  auth: {
    async signUp(username: string, password: string, name: string) {
      const normalizedUsername = validateUsername(username);
      const internalEmail = buildInternalEmail(normalizedUsername);

      const { data: existingProfile, error: existingProfileError } = await supabase
        .from("users")
        .select("id")
        .eq("username", normalizedUsername)
        .maybeSingle();

      if (existingProfileError) {
        throw new Error(existingProfileError.message);
      }

      if (existingProfile) {
        throw new Error("That username is already taken.");
      }

      const { data, error } = await supabase.auth.signUp({
        email: internalEmail,
        password,
        options: {
          data: {
            display_name: name,
            username: normalizedUsername,
          },
        },
      });

      if (error) {
        throw mapAuthError(error);
      }

      if (!data.user) {
        throw new Error("Sign up did not return a user.");
      }

      // If email confirmation is enabled, Supabase may return a user without
      // an authenticated session yet. In that case we cannot create the
      // profile row under RLS until the user verifies and signs in. That
      // behavior does not match this app's username-only auth UX, so surface
      // a clear setup error instead of a misleading partial signup.
      if (!data.session) {
        await supabase.auth.signOut();
        throw new Error(USERNAME_ONLY_AUTH_SETUP_MESSAGE);
      }

      return await ensureProfile(data.user);
    },

    async signIn(username: string, password: string) {
      const normalizedUsername = validateUsername(username);

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("email")
        .eq("username", normalizedUsername)
        .maybeSingle();

      if (profileError) {
        throw new Error(profileError.message);
      }

      const internalEmail =
        profile?.email ?? buildInternalEmail(normalizedUsername);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password,
      });

      if (error) {
        throw mapAuthError(error);
      }

      if (!data.user) {
        throw new Error("Sign in did not return a user.");
      }

      return await ensureProfile(data.user);
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw new Error(error.message);
      }
    },

    async getSession() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw new Error(error.message);
      }

      if (!data.session?.user) {
        return null;
      }

      return await ensureProfile(data.session.user);
    },
  },

  users: {
    async getProfile(userId: string) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as UserProfile;
    },

    async updateProfile(userId: string, updates: Partial<UserProfile>) {
      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", userId)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as UserProfile;
    },
  },

  plans: {
    async createPlan(input: PlanGenerationOutput) {
      const { data: createdPlan, error: planError } = await supabase
        .from("weekly_plans")
        .insert(input.plan)
        .select("*")
        .single();

      if (planError) {
        throw new Error(planError.message);
      }

      const dayRows = input.days.map((day) => ({
        plan_id: createdPlan.id,
        day_number: day.day_number,
        muscle_group: day.muscle_group,
        status: day.status,
        scheduled_date: day.scheduled_date,
      }));

      const { data: createdDays, error: daysError } = await supabase
        .from("workout_days")
        .insert(dayRows)
        .select("*");

      if (daysError) {
        throw new Error(daysError.message);
      }

      const dayByNumber: Record<number, string> = {};

      for (let i = 0; i < createdDays.length; i++) {
        dayByNumber[createdDays[i].day_number] = createdDays[i].id;
      }

      const exerciseRows = input.days.flatMap((day) =>
        day.exercises.map((exercise) => ({
          ...exercise,
          workout_day_id: dayByNumber[day.day_number],
        }))
      );

      if (exerciseRows.length > 0) {
        const { error: exerciseError } = await supabase
          .from("exercises")
          .insert(exerciseRows);

        if (exerciseError) {
          throw new Error(exerciseError.message);
        }
      }

      return createdPlan as WeeklyPlan;
    },

    async deletePlan(planId: string) {
      const { error } = await supabase
        .from("weekly_plans")
        .delete()
        .eq("id", planId);

      if (error) {
        throw new Error(error.message);
      }
    },

    async getCurrentPlan(userId: string) {
      const { data, error } = await supabase
        .from("weekly_plans")
        .select("*")
        .eq("user_id", userId)
        .order("week_start", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return (data as WeeklyPlan | null) ?? null;
    },

    async getPlanWithDetails(planId: string) {
      return await fetchPlanWithDetails(planId);
    },

    async replacePlanDays(planId: string, days: PlanGenerationOutput["days"]) {
      if (days.length === 0) {
        return;
      }

      const dayNumbers = days.map((day) => day.day_number);
      const { data: existingDays, error: daysError } = await supabase
        .from("workout_days")
        .select("*")
        .eq("plan_id", planId)
        .in("day_number", dayNumbers);

      if (daysError) {
        throw new Error(daysError.message);
      }

      const existingDayIds = (existingDays ?? []).map((day) => day.id);

      if (existingDayIds.length > 0) {
        const { data: existingExercises, error: existingExercisesError } = await supabase
          .from("exercises")
          .select("id")
          .in("workout_day_id", existingDayIds);

        if (existingExercisesError) {
          throw new Error(existingExercisesError.message);
        }

        const existingExerciseIds = (existingExercises ?? []).map((exercise) => exercise.id);

        if (existingExerciseIds.length > 0) {
          const { data: existingLogs, error: existingLogsError } = await supabase
            .from("logged_sets")
            .select("id")
            .in("exercise_id", existingExerciseIds)
            .limit(1);

          if (existingLogsError) {
            throw new Error(existingLogsError.message);
          }

          if (existingLogs && existingLogs.length > 0) {
            throw new Error(
              "Cannot regenerate a day that already has logged workout data."
            );
          }
        }

        const { error: deleteDaysError } = await supabase
          .from("workout_days")
          .delete()
          .in("id", existingDayIds);

        if (deleteDaysError) {
          throw new Error(deleteDaysError.message);
        }
      }

      const dayRows = days.map((day) => ({
        plan_id: planId,
        day_number: day.day_number,
        muscle_group: day.muscle_group,
        status: day.status,
        scheduled_date: day.scheduled_date,
      }));

      const { data: createdDays, error: createDaysError } = await supabase
        .from("workout_days")
        .insert(dayRows)
        .select("*");

      if (createDaysError) {
        throw new Error(createDaysError.message);
      }

      const dayByNumber: Record<number, string> = {};

      for (let i = 0; i < createdDays.length; i++) {
        dayByNumber[createdDays[i].day_number] = createdDays[i].id;
      }

      const exerciseRows = days.flatMap((day) =>
        day.exercises.map((exercise) => ({
          ...exercise,
          workout_day_id: dayByNumber[day.day_number],
        }))
      );

      if (exerciseRows.length === 0) {
        return;
      }

      const { error: createExercisesError } = await supabase
        .from("exercises")
        .insert(exerciseRows);

      if (createExercisesError) {
        throw new Error(createExercisesError.message);
      }
    },
  },

  workouts: {
    async logSet(set: InsertLoggedSet) {
      const { data, error } = await supabase
        .from("logged_sets")
        .insert(set)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as LoggedSet;
    },

    async replaceDayLogs(dayId: string, sets: InsertLoggedSet[]) {
      const exercises = await loadLogApi.workouts.getExercisesForDay(dayId);
      const exerciseIds = exercises.map((exercise) => exercise.id);

      if (exerciseIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("logged_sets")
          .delete()
          .in("exercise_id", exerciseIds);

        if (deleteError) {
          throw new Error(deleteError.message);
        }
      }

      if (sets.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from("logged_sets")
        .insert(sets)
        .select("*");

      if (error) {
        throw new Error(error.message);
      }

      return (data as LoggedSet[]) ?? [];
    },

    async getExercisesForDay(dayId: string) {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .eq("workout_day_id", dayId);

      if (error) {
        throw new Error(error.message);
      }

      return (data as Exercise[]) ?? [];
    },

    async getLogsForExercise(exerciseId: string) {
      const { data, error } = await supabase
        .from("logged_sets")
        .select("*")
        .eq("exercise_id", exerciseId)
        .order("logged_at", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return (data as LoggedSet[]) ?? [];
    },

    async getWorkoutDayHistory(dayId: string) {
      return await fetchWorkoutDayHistory(dayId);
    },

    async updateWorkoutDayStatus(dayId: string, status: WorkoutDay["status"]) {
      const { data, error } = await supabase
        .from("workout_days")
        .update({ status })
        .eq("id", dayId)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as WorkoutDay;
    },
  },

  stats: {
    async getStreak(userId: string) {
      const { data, error } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return {
          id: `streak-${userId}`,
          user_id: userId,
          current_streak: 0,
          longest_streak: 0,
          last_workout_date: "",
        };
      }

      return data as Streak;
    },

    async updateStreak(userId: string) {
      const history = await fetchWorkoutHistoryForUser(userId);
      const computed = calculateStreak(history);

      const payload = {
        user_id: userId,
        current_streak: computed.current_streak,
        longest_streak: computed.longest_streak,
        last_workout_date: computed.last_workout_date ?? "",
      };

      const { data: existing, error: existingError } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingError) {
        throw new Error(existingError.message);
      }

      if (existing) {
        const { data: updated, error: updateError } = await supabase
          .from("streaks")
          .update(payload)
          .eq("id", existing.id)
          .select("*")
          .single();

        if (updateError) {
          throw new Error(updateError.message);
        }

        return updated as Streak;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("streaks")
        .insert(payload)
        .select("*")
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      return inserted as Streak;
    },

    async getWorkoutHistory(userId: string, limit?: number) {
      try {
        return await fetchWorkoutHistoryForUser(userId, limit);
      } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to load workout history."));
      }
    },

    async getRecentWorkoutHistory(userId: string, limit?: number) {
      try {
        return await fetchRecentWorkoutHistoryForUser(userId, limit ?? 5);
      } catch (error) {
        throw new Error(
          getErrorMessage(error, "Failed to load recent workout history.")
        );
      }
    },

    async getHistoricalExerciseSessions(userId: string, limit?: number) {
      try {
        return await fetchHistoricalExerciseSessionsForUser(userId, limit);
      } catch (error) {
        throw new Error(
          getErrorMessage(error, "Failed to load historical exercise sessions.")
        );
      }
    },
  },
};
