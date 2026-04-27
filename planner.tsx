import type {
  UserProfile,
  Exercise,
  HistoricalExerciseSession,
  LoggedSet,
  InsertWeeklyPlan,
  InsertWorkoutDay,
  InsertExercise,
  PlanGenerationInput,
  PlanGenerationOutput
} from "./types";

import { getWeekStartISO } from "./planUtils";
import { getExerciseOutcome } from "./utils/workout_evaluation";

function addDaysToISO(isoDate: string, daysToAdd: number): string {
  const date = new Date(isoDate + "T00:00:00");
  date.setDate(date.getDate() + daysToAdd);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

function buildSplit(daysPerWeek: number): string[] {
  if (daysPerWeek <= 1) {
    return ["Full Body", "Rest", "Rest", "Rest", "Rest", "Rest", "Rest"];
  } else if (daysPerWeek === 2) {
    return ["Full Body", "Rest", "Rest", "Full Body", "Rest", "Rest", "Rest"];
  } else if (daysPerWeek === 3) {
    return ["Upper Body", "Rest", "Lower Body", "Rest", "Full Body", "Rest", "Rest"];
  } else if (daysPerWeek === 4) {
    return ["Upper Body", "Lower Body", "Rest", "Upper Body", "Lower Body", "Rest", "Rest"];
  } else if (daysPerWeek === 5) {
    return ["Push", "Pull", "Legs", "Rest", "Upper Body", "Lower Body", "Rest"];
  } else if (daysPerWeek === 6) {
    return ["Push", "Pull", "Legs", "Push", "Pull", "Legs", "Rest"];
  } else if (daysPerWeek === 7) {
    return ["Push", "Pull", "Legs", "Upper Body", "Lower Body", "Push", "Full Body"];
  } else {
    return ["Push", "Pull", "Legs", "Upper Body", "Lower Body", "Push", "Full Body"];
  }
}

function getExerciseNames(group: string): string[] {
  if (group === "Upper Body") {
    return ["Bench Press", "Shoulder Press", "Lat Pulldown", "Seated Row"];
  } else if (group === "Lower Body") {
    return ["Squat", "Leg Press", "Romanian Deadlift", "Calf Raise"];
  } else if (group === "Full Body") {
    return ["Goblet Squat", "Chest Press", "Seated Row", "Dumbbell Shoulder Press"];
  } else if (group === "Push") {
    return ["Bench Press", "Incline Dumbbell Press", "Shoulder Press", "Triceps Pushdown"];
  } else if (group === "Pull") {
    return ["Lat Pulldown", "Seated Cable Row", "Face Pull", "Dumbbell Curl"];
  } else if (group === "Legs") {
    return ["Squat", "Romanian Deadlift", "Leg Curl", "Calf Raise"];
  } else {
    return [];
  }
}

function getTargetSets(level: UserProfile["fitness_level"]): number {
  if (level === "beginner") {
    return 2;
  } else if (level === "intermediate") {
    return 3;
  } else {
    return 4;
  }
}

function getTargetReps(level: UserProfile["fitness_level"]): number {
  if (level === "beginner") {
    return 10;
  } else if (level === "intermediate") {
    return 8;
  } else {
    return 6;
  }
}

function getDefaultWeight(
  name: string,
  level: UserProfile["fitness_level"]
): number {
  const weights: Record<
    string,
    { beginner: number; intermediate: number; advanced: number }
  > = {
    "Bench Press": { beginner: 45, intermediate: 75, advanced: 115 },
    "Shoulder Press": { beginner: 15, intermediate: 30, advanced: 45 },
    "Lat Pulldown": { beginner: 40, intermediate: 60, advanced: 90 },
    "Seated Row": { beginner: 40, intermediate: 60, advanced: 90 },
    "Squat": { beginner: 45, intermediate: 95, advanced: 155 },
    "Leg Press": { beginner: 90, intermediate: 140, advanced: 220 },
    "Romanian Deadlift": { beginner: 45, intermediate: 95, advanced: 155 },
    "Calf Raise": { beginner: 25, intermediate: 50, advanced: 80 },
    "Goblet Squat": { beginner: 15, intermediate: 30, advanced: 50 },
    "Chest Press": { beginner: 40, intermediate: 65, advanced: 95 },
    "Dumbbell Shoulder Press": { beginner: 10, intermediate: 20, advanced: 30 },
    "Incline Dumbbell Press": { beginner: 15, intermediate: 25, advanced: 40 },
    "Triceps Pushdown": { beginner: 15, intermediate: 30, advanced: 45 },
    "Seated Cable Row": { beginner: 40, intermediate: 60, advanced: 90 },
    "Face Pull": { beginner: 15, intermediate: 25, advanced: 40 },
    "Dumbbell Curl": { beginner: 10, intermediate: 20, advanced: 30 },
    "Leg Curl": { beginner: 30, intermediate: 50, advanced: 70 }
  };

  if (weights[name]) {
    return weights[name][level];
  }

  if (level === "beginner") {
    return 10;
  } else if (level === "intermediate") {
    return 25;
  } else {
    return 40;
  }
}

function getProgressionStep(
  name: string,
  level: UserProfile["fitness_level"]
): number {
  if (
    name === "Bench Press" ||
    name === "Squat" ||
    name === "Leg Press" ||
    name === "Romanian Deadlift" ||
    name === "Chest Press"
  ) {
    if (level === "advanced" && (name === "Leg Press" || name === "Squat")) {
      return 10;
    }

    return 5;
  } else {
    if (level === "beginner") {
      return 2.5;
    }

    return 5;
  }
}

function roundToNearestHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function findPreviousExercise(
  previousPlan: PlanGenerationInput["previousPlan"],
  exerciseName: string
): {
  exercise: Exercise & { logs: LoggedSet[] };
  scheduled_date: string;
} | null {
  if (!previousPlan) {
    return null;
  }

  for (let i = 0; i < previousPlan.days.length; i++) {
    const day = previousPlan.days[i];

    for (let j = 0; j < day.exercises.length; j++) {
      const exercise = day.exercises[j];

      if (exercise.name === exerciseName) {
        return {
          exercise,
          scheduled_date: day.scheduled_date,
        };
      }
    }
  }

  return null;
}

function getMuscleGroupHistory(
  historicalSessions: HistoricalExerciseSession[] | undefined,
  muscleGroup: string,
  targetDate: string
): HistoricalExerciseSession[] {
  if (!historicalSessions) {
    return [];
  }

  return historicalSessions
    .filter(
      (session) =>
        session.muscle_group === muscleGroup &&
        session.scheduled_date < targetDate
    )
    .sort((a, b) => {
      if (a.scheduled_date === b.scheduled_date) {
        return b.exercise_name.localeCompare(a.exercise_name);
      }

      return b.scheduled_date.localeCompare(a.scheduled_date);
    })
    .slice(0, 7);
}

function findLatestMatchingExerciseSession(
  historicalSessions: HistoricalExerciseSession[] | undefined,
  muscleGroup: string,
  exerciseName: string,
  targetDate: string
): HistoricalExerciseSession | null {
  if (!historicalSessions) {
    return null;
  }

  const matchingSessions = historicalSessions
    .filter(
      (session) =>
        session.muscle_group === muscleGroup &&
        session.exercise_name === exerciseName &&
        session.scheduled_date < targetDate
    )
    .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));

  if (matchingSessions.length === 0) {
    return null;
  }

  return matchingSessions[0];
}


function getReducedWeight(
  currentWeight: number,
  progressionStep: number
): number {
  const reducedWeight = currentWeight - progressionStep;

  if (reducedWeight < progressionStep) {
    return progressionStep;
  }

  return reducedWeight;
}

function getAdjustedWeight(
  baseWeight: number,
  direction: "up" | "down",
  progressionStep: number,
  useConservativeAdjustment: boolean
): number {
  const adjustment = useConservativeAdjustment
    ? Math.max(0.5, progressionStep / 2)
    : progressionStep;

  if (direction === "up") {
    return roundToNearestHalf(baseWeight + adjustment);
  }

  return roundToNearestHalf(getReducedWeight(baseWeight, adjustment));
}

function getHistoricalWeight(
  name: string,
  muscleGroup: string,
  level: UserProfile["fitness_level"],
  targetDate: string,
  historicalSessions: HistoricalExerciseSession[] | undefined,
  previousPlan?: PlanGenerationInput["previousPlan"]
): number | null {
  const recentGroupSessions = getMuscleGroupHistory(
    historicalSessions,
    muscleGroup,
    targetDate
  );

  if (recentGroupSessions.length === 0) {
    return null;
  }

  const latestMatchingSession = findLatestMatchingExerciseSession(
    historicalSessions,
    muscleGroup,
    name,
    targetDate
  );

  const previousExerciseEntry = findPreviousExercise(previousPlan, name);
  const fallbackProgressionStep = getProgressionStep(name, level);
  const baseWeight =
    latestMatchingSession?.current_weight ??
    previousExerciseEntry?.exercise.current_weight ??
    getDefaultWeight(name, level);
  const progressionStep =
    latestMatchingSession?.progression_step ??
    previousExerciseEntry?.exercise.progression_step ??
    fallbackProgressionStep;

  let score = 0;

  for (let i = 0; i < recentGroupSessions.length; i++) {
    const session = recentGroupSessions[i];
    const outcome = getExerciseOutcome(
      {
        target_sets: session.target_sets,
        target_reps: session.target_reps,
        current_weight: session.current_weight,
      },
      session.logs
    );

    if (outcome === "completed") {
      score += 1;
    } else {
      score -= 1;
    }
  }

  if (score > 0) {
    return getAdjustedWeight(
      baseWeight,
      "up",
      progressionStep,
      recentGroupSessions.length < 7
    );
  }

  if (score < 0) {
    return getAdjustedWeight(
      baseWeight,
      "down",
      progressionStep,
      recentGroupSessions.length < 7
    );
  }

  return roundToNearestHalf(baseWeight);
}

function getNextWeight(
  name: string,
  muscleGroup: string,
  level: UserProfile["fitness_level"],
  targetDate: string,
  historicalSessions?: HistoricalExerciseSession[],
  previousPlan?: PlanGenerationInput["previousPlan"]
): number {
  const historicalWeight = getHistoricalWeight(
    name,
    muscleGroup,
    level,
    targetDate,
    historicalSessions,
    previousPlan
  );

  if (historicalWeight !== null) {
    return historicalWeight;
  }

  const previousExerciseEntry = findPreviousExercise(previousPlan, name);

  if (!previousExerciseEntry) {
    return getDefaultWeight(name, level);
  }

  if (
    previousExerciseEntry.exercise.logs.length === 0 &&
    previousExerciseEntry.scheduled_date >= targetDate
  ) {
    return previousExerciseEntry.exercise.current_weight;
  }

  const outcome = getExerciseOutcome(
    previousExerciseEntry.exercise,
    previousExerciseEntry.exercise.logs
  );

  if (outcome === "completed") {
    return (
      previousExerciseEntry.exercise.current_weight +
      previousExerciseEntry.exercise.progression_step
    );
  }

  if (outcome === "partial" || outcome === "missed") {
    return getReducedWeight(
      previousExerciseEntry.exercise.current_weight,
      previousExerciseEntry.exercise.progression_step
    );
  }

  return previousExerciseEntry.exercise.current_weight;
}

export function generatePlan(input: PlanGenerationInput): PlanGenerationOutput {
  const user = input.user;
  const weekStart = input.week_start ?? getWeekStartISO(new Date());
  const includedDayNumbers = input.day_numbers ?? [1, 2, 3, 4, 5, 6, 7];
  const split = buildSplit(user.available_days_per_week);

  const plan: InsertWeeklyPlan = {
    user_id: user.id,
    week_start: weekStart,
    status: "active"
  };

  const days: (InsertWorkoutDay & { exercises: InsertExercise[] })[] = [];

  for (let i = 0; i < 7; i++) {
    const group = split[i];
    const scheduledDate = addDaysToISO(weekStart, i);
    const dayNumber = i + 1;

    if (!includedDayNumbers.includes(dayNumber)) {
      continue;
    }

    const day: InsertWorkoutDay & { exercises: InsertExercise[] } = {
      plan_id: "TEMP_PLAN_ID",
      day_number: dayNumber,
      muscle_group: group,
      status: "scheduled",
      scheduled_date: scheduledDate,
      exercises: []
    };

    const exerciseNames = getExerciseNames(group);

    for (let j = 0; j < exerciseNames.length; j++) {
      const name = exerciseNames[j];

      const exercise: InsertExercise = {
        workout_day_id: "TEMP_DAY_" + String(i + 1),
        name: name,
        target_sets: getTargetSets(user.fitness_level),
        target_reps: getTargetReps(user.fitness_level),
        current_weight: getNextWeight(
          name,
          group,
          user.fitness_level,
          scheduledDate,
          input.historical_sessions,
          input.previousPlan
        ),
        progression_step: getProgressionStep(name, user.fitness_level)
      };

      day.exercises.push(exercise);
    }

    days.push(day);
  }

  return {
    plan,
    days
  };
}
