import type {
  UserProfile,
  Exercise,
  LoggedSet,
  InsertWeeklyPlan,
  InsertWorkoutDay,
  InsertExercise,
  PlanGenerationInput,
  PlanGenerationOutput
} from "./types";

import { getWeekStartISO } from "./planUtils";

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
  } else {
    return ["Push", "Pull", "Legs", "Rest", "Upper Body", "Lower Body", "Full Body"];
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
    "Bench Press": { beginner: 65, intermediate: 95, advanced: 135 },
    "Shoulder Press": { beginner: 30, intermediate: 45, advanced: 60 },
    "Lat Pulldown": { beginner: 50, intermediate: 70, advanced: 100 },
    "Seated Row": { beginner: 50, intermediate: 70, advanced: 100 },
    "Squat": { beginner: 95, intermediate: 135, advanced: 185 },
    "Leg Press": { beginner: 90, intermediate: 140, advanced: 180 },
    "Romanian Deadlift": { beginner: 75, intermediate: 115, advanced: 155 },
    "Calf Raise": { beginner: 40, intermediate: 60, advanced: 90 },
    "Goblet Squat": { beginner: 25, intermediate: 40, advanced: 55 },
    "Chest Press": { beginner: 50, intermediate: 70, advanced: 100 },
    "Dumbbell Shoulder Press": { beginner: 20, intermediate: 30, advanced: 40 },
    "Incline Dumbbell Press": { beginner: 25, intermediate: 40, advanced: 55 },
    "Triceps Pushdown": { beginner: 25, intermediate: 40, advanced: 55 },
    "Seated Cable Row": { beginner: 50, intermediate: 70, advanced: 100 },
    "Face Pull": { beginner: 20, intermediate: 30, advanced: 45 },
    "Dumbbell Curl": { beginner: 15, intermediate: 25, advanced: 35 },
    "Leg Curl": { beginner: 40, intermediate: 60, advanced: 80 }
  };

  if (weights[name]) {
    return weights[name][level];
  }

  if (level === "beginner") {
    return 25;
  } else if (level === "intermediate") {
    return 40;
  } else {
    return 60;
  }
}

function getProgressionStep(name: string): number {
  if (
    name === "Bench Press" ||
    name === "Squat" ||
    name === "Leg Press" ||
    name === "Romanian Deadlift" ||
    name === "Chest Press"
  ) {
    return 5;
  } else {
    return 5;
  }
}

function findPreviousExercise(
  previousPlan: PlanGenerationInput["previousPlan"],
  exerciseName: string
): (Exercise & { logs: LoggedSet[] }) | null {
  if (!previousPlan) {
    return null;
  }

  for (let i = 0; i < previousPlan.days.length; i++) {
    const day = previousPlan.days[i];

    for (let j = 0; j < day.exercises.length; j++) {
      const exercise = day.exercises[j];

      if (exercise.name === exerciseName) {
        return exercise;
      }
    }
  }

  return null;
}


function getExerciseOutcome(
  previousExercise: Exercise & { logs: LoggedSet[] }
): "completed" | "partial" | "missed" {
  const neededSets = previousExercise.target_sets;
  const neededReps = previousExercise.target_reps;

  if (previousExercise.logs.length === 0) {
    return "missed";
  }

  if (previousExercise.logs.length < neededSets) {
    return "partial";
  }

  let completedSets = 0;

  for (let i = 0; i < previousExercise.logs.length; i++) {
    const log = previousExercise.logs[i];

    if (log.completed && log.reps_completed >= neededReps) {
      completedSets = completedSets + 1;
    }
  }

  if (completedSets >= neededSets) {
    return "completed";
  }

  return "partial";
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

function getNextWeight(
  name: string,
  level: UserProfile["fitness_level"],
  previousPlan?: PlanGenerationInput["previousPlan"]
): number {
  const previousExercise = findPreviousExercise(previousPlan, name);

  if (!previousExercise) {
    return getDefaultWeight(name, level);
  }

  const outcome = getExerciseOutcome(previousExercise);

  if (outcome === "completed") {
    return previousExercise.current_weight + previousExercise.progression_step;
  }

  if (outcome === "missed") {
    return getReducedWeight(
      previousExercise.current_weight,
      previousExercise.progression_step
    );
  }

  return previousExercise.current_weight;
}

export function generatePlan(input: PlanGenerationInput): PlanGenerationOutput {
  const user = input.user;
  const weekStart = getWeekStartISO(new Date());
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

    const day: InsertWorkoutDay & { exercises: InsertExercise[] } = {
      plan_id: "TEMP_PLAN_ID",
      day_number: i + 1,
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
        current_weight: getNextWeight(name, user.fitness_level, input.previousPlan),
        progression_step: getProgressionStep(name)
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