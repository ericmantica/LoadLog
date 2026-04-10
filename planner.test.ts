import { describe, it, expect } from "vitest";
import { generatePlan } from "./planner";
import type { PlanGenerationInput, UserProfile } from "./types";

function makeUser(
  fitness_level: UserProfile["fitness_level"],
  available_days_per_week: number
): UserProfile {
  return {
    id: "user-1",
    email: "test@example.com",
    display_name: "Alice",
    fitness_level,
    available_days_per_week,
    created_at: "2025-01-01"
  };
}

function makePreviousPlanForExercise(
  exerciseName: string,
  options?: {
    currentWeight?: number;
    progressionStep?: number;
    targetSets?: number;
    targetReps?: number;
    logs?: {
      reps_completed: number;
      completed: boolean;
      weight_used?: number;
    }[];
  }
): PlanGenerationInput["previousPlan"] {
  const currentWeight = options?.currentWeight ?? 100;
  const progressionStep = options?.progressionStep ?? 5;
  const targetSets = options?.targetSets ?? 2;
  const targetReps = options?.targetReps ?? 10;
  const logsInput = options?.logs ?? [];

  return {
    id: "prev-plan-1",
    user_id: "user-1",
    week_start: "2025-03-31",
    status: "completed",
    created_at: "2025-03-31T00:00:00.000Z",
    days: [
      {
        id: "day-1",
        plan_id: "prev-plan-1",
        day_number: 1,
        muscle_group: "Upper Body",
        status: "completed",
        scheduled_date: "2025-03-31",
        exercises: [
          {
            id: "exercise-1",
            workout_day_id: "day-1",
            name: exerciseName,
            target_sets: targetSets,
            target_reps: targetReps,
            current_weight: currentWeight,
            progression_step: progressionStep,
            logs: logsInput.map((log, index) => {
              return {
                id: "log-" + String(index + 1),
                exercise_id: "exercise-1",
                set_number: index + 1,
                reps_completed: log.reps_completed,
                weight_used: log.weight_used ?? currentWeight,
                completed: log.completed,
                logged_at: "2025-03-31T10:00:00.000Z"
              };
            })
          }
        ]
      }
    ]
  };
}

function getWorkoutDays(result: ReturnType<typeof generatePlan>) {
  return result.days.filter((day) => day.muscle_group !== "Rest");
}

function getRestDays(result: ReturnType<typeof generatePlan>) {
  return result.days.filter((day) => day.muscle_group === "Rest");
}

function getDayByGroup(
  result: ReturnType<typeof generatePlan>,
  group: string
) {
  return result.days.find((day) => day.muscle_group === group);
}

function getExerciseByName(
  result: ReturnType<typeof generatePlan>,
  exerciseName: string
) {
  for (let i = 0; i < result.days.length; i++) {
    const day = result.days[i];

    for (let j = 0; j < day.exercises.length; j++) {
      const exercise = day.exercises[j];

      if (exercise.name === exerciseName) {
        return exercise;
      }
    }
  }

  return undefined;
}

describe("generatePlan", () => {
  it("should generate a weekly plan with 7 days", () => {
    const user = makeUser("beginner", 3);
    const result = generatePlan({ user });

    expect(result.plan).toBeDefined();
    expect(result.days.length).toBe(7);
  });

  it("should generate exactly 1 workout day for a 1-day user", () => {
    const user = makeUser("beginner", 1);
    const result = generatePlan({ user });
    const workoutDays = getWorkoutDays(result);

    expect(workoutDays.length).toBe(1);
    expect(workoutDays[0].muscle_group).toBe("Full Body");
  });

  it("should generate exactly 2 workout days for a 2-day user", () => {
    const user = makeUser("beginner", 2);
    const result = generatePlan({ user });
    const workoutDays = getWorkoutDays(result);

    expect(workoutDays.length).toBe(2);
    expect(workoutDays[0].muscle_group).toBe("Full Body");
    expect(workoutDays[1].muscle_group).toBe("Full Body");
  });

  it("should generate Upper Body, Lower Body, and Full Body split for a 3-day user", () => {
    const user = makeUser("beginner", 3);
    const result = generatePlan({ user });
    const workoutGroups = getWorkoutDays(result).map((day) => day.muscle_group);

    expect(workoutGroups).toEqual(["Upper Body", "Lower Body", "Full Body"]);
  });

  it("should generate exactly 4 workout days for a 4-day user", () => {
    const user = makeUser("intermediate", 4);
    const result = generatePlan({ user });
    const workoutGroups = getWorkoutDays(result).map((day) => day.muscle_group);

    expect(workoutGroups.length).toBe(4);
    expect(workoutGroups).toEqual([
      "Upper Body",
      "Lower Body",
      "Upper Body",
      "Lower Body"
    ]);
  });

  it("should generate exactly 5 workout days for a 5-day user", () => {
    const user = makeUser("intermediate", 5);
    const result = generatePlan({ user });
    const workoutGroups = getWorkoutDays(result).map((day) => day.muscle_group);

    expect(workoutGroups.length).toBe(5);
    expect(workoutGroups).toEqual([
      "Push",
      "Pull",
      "Legs",
      "Upper Body",
      "Lower Body"
    ]);
  });

  it("should generate exactly 6 workout days for a 6-day user", () => {
    const user = makeUser("advanced", 6);
    const result = generatePlan({ user });
    const workoutGroups = getWorkoutDays(result).map((day) => day.muscle_group);

    expect(workoutGroups.length).toBe(6);
    expect(workoutGroups).toEqual([
      "Push",
      "Pull",
      "Legs",
      "Push",
      "Pull",
      "Legs"
    ]);
  });

  it("should generate 7 total days and include Full Body on day 7 for a 7-day user", () => {
    const user = makeUser("advanced", 7);
    const result = generatePlan({ user });

    expect(result.days.length).toBe(7);
    expect(result.days[6].muscle_group).toBe("Full Body");
  });

  it("should set beginner exercises to 2 sets and 10 reps", () => {
    const user = makeUser("beginner", 3);
    const result = generatePlan({ user });
    const exercise = getExerciseByName(result, "Bench Press");

    expect(exercise).toBeDefined();
    expect(exercise?.target_sets).toBe(2);
    expect(exercise?.target_reps).toBe(10);
  });

  it("should set intermediate exercises to 3 sets and 8 reps", () => {
    const user = makeUser("intermediate", 3);
    const result = generatePlan({ user });
    const exercise = getExerciseByName(result, "Bench Press");

    expect(exercise).toBeDefined();
    expect(exercise?.target_sets).toBe(3);
    expect(exercise?.target_reps).toBe(8);
  });

  it("should set advanced exercises to 4 sets and 6 reps", () => {
    const user = makeUser("advanced", 3);
    const result = generatePlan({ user });
    const exercise = getExerciseByName(result, "Bench Press");

    expect(exercise).toBeDefined();
    expect(exercise?.target_sets).toBe(4);
    expect(exercise?.target_reps).toBe(6);
  });

  it("should leave Rest days with no exercises", () => {
    const user = makeUser("beginner", 3);
    const result = generatePlan({ user });
    const restDays = getRestDays(result);

    expect(restDays.length).toBeGreaterThan(0);

    for (let i = 0; i < restDays.length; i++) {
      expect(restDays[i].exercises.length).toBe(0);
    }
  });

  it("should generate exercises for Upper Body days", () => {
    const user = makeUser("beginner", 3);
    const result = generatePlan({ user });
    const upperDay = getDayByGroup(result, "Upper Body");

    expect(upperDay).toBeDefined();
    expect(upperDay?.exercises.map((exercise) => exercise.name)).toEqual([
      "Bench Press",
      "Shoulder Press",
      "Lat Pulldown",
      "Seated Row"
    ]);
  });

  it("should generate exercises for Lower Body days", () => {
    const user = makeUser("beginner", 4);
    const result = generatePlan({ user });
    const lowerDay = getDayByGroup(result, "Lower Body");

    expect(lowerDay).toBeDefined();
    expect(lowerDay?.exercises.map((exercise) => exercise.name)).toEqual([
      "Squat",
      "Leg Press",
      "Romanian Deadlift",
      "Calf Raise"
    ]);
  });

  it("should generate exercises for Full Body days", () => {
    const user = makeUser("beginner", 3);
    const result = generatePlan({ user });
    const fullBodyDay = getDayByGroup(result, "Full Body");

    expect(fullBodyDay).toBeDefined();
    expect(fullBodyDay?.exercises.map((exercise) => exercise.name)).toEqual([
      "Goblet Squat",
      "Chest Press",
      "Seated Row",
      "Dumbbell Shoulder Press"
    ]);
  });

  it("should generate push-day specific exercises", () => {
    const user = makeUser("intermediate", 5);
    const result = generatePlan({ user });
    const pushDay = getDayByGroup(result, "Push");

    expect(pushDay).toBeDefined();
    expect(pushDay?.exercises.map((exercise) => exercise.name)).toEqual([
      "Bench Press",
      "Incline Dumbbell Press",
      "Shoulder Press",
      "Triceps Pushdown"
    ]);
  });

  it("should generate pull-day specific exercises", () => {
    const user = makeUser("intermediate", 5);
    const result = generatePlan({ user });
    const pullDay = getDayByGroup(result, "Pull");

    expect(pullDay).toBeDefined();
    expect(pullDay?.exercises.map((exercise) => exercise.name)).toEqual([
      "Lat Pulldown",
      "Seated Cable Row",
      "Face Pull",
      "Dumbbell Curl"
    ]);
  });

  it("should generate legs-day specific exercises", () => {
    const user = makeUser("intermediate", 5);
    const result = generatePlan({ user });
    const legsDay = getDayByGroup(result, "Legs");

    expect(legsDay).toBeDefined();
    expect(legsDay?.exercises.map((exercise) => exercise.name)).toEqual([
      "Squat",
      "Romanian Deadlift",
      "Leg Curl",
      "Calf Raise"
    ]);
  });

  it("should set plan status to active", () => {
    const user = makeUser("beginner", 3);
    const result = generatePlan({ user });

    expect(result.plan.status).toBe("active");
  });

  it("should assign day numbers from 1 through 7", () => {
    const user = makeUser("beginner", 3);
    const result = generatePlan({ user });
    const dayNumbers = result.days.map((day) => day.day_number);

    expect(dayNumbers).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("should assign temporary ids for plan_id and workout_day_id", () => {
    const user = makeUser("beginner", 3);
    const result = generatePlan({ user });

    expect(result.days[0].plan_id).toBe("TEMP_PLAN_ID");

    const firstWorkoutDay = getWorkoutDays(result)[0];
    expect(firstWorkoutDay.exercises[0].workout_day_id).toBe("TEMP_DAY_1");
  });

  it("should keep scheduled dates increasing by one day", () => {
    const user = makeUser("beginner", 3);
    const result = generatePlan({ user });

    for (let i = 1; i < result.days.length; i++) {
      const previousDate = new Date(result.days[i - 1].scheduled_date + "T00:00:00");
      const currentDate = new Date(result.days[i].scheduled_date + "T00:00:00");
      const difference =
        (currentDate.getTime() - previousDate.getTime()) /
        (1000 * 60 * 60 * 24);

      expect(difference).toBe(1);
    }
  });

  it("should use the default beginner weight when there is no previous plan", () => {
    const user = makeUser("beginner", 3);
    const result = generatePlan({ user });
    const benchPress = getExerciseByName(result, "Bench Press");

    expect(benchPress).toBeDefined();
    expect(benchPress?.current_weight).toBe(65);
  });

  it("should use advanced default weight for Bench Press when no previous plan exists", () => {
    const user = makeUser("advanced", 3);
    const result = generatePlan({ user });
    const benchPress = getExerciseByName(result, "Bench Press");

    expect(benchPress).toBeDefined();
    expect(benchPress?.current_weight).toBe(135);
  });

  it("should increase weight when previous exercise was completed", () => {
    const user = makeUser("beginner", 3);

    const previousPlan = makePreviousPlanForExercise("Bench Press", {
      currentWeight: 65,
      progressionStep: 5,
      targetSets: 2,
      targetReps: 10,
      logs: [
        {
          reps_completed: 10,
          completed: true
        },
        {
          reps_completed: 10,
          completed: true
        }
      ]
    });

    const result = generatePlan({
      user,
      previousPlan
    });

    const benchPress = getExerciseByName(result, "Bench Press");

    expect(benchPress).toBeDefined();
    expect(benchPress?.current_weight).toBe(70);
  });

  it("should keep weight the same when previous exercise was partial because logs were fewer than target sets", () => {
    const user = makeUser("beginner", 3);

    const previousPlan = makePreviousPlanForExercise("Bench Press", {
      currentWeight: 65,
      progressionStep: 5,
      targetSets: 2,
      targetReps: 10,
      logs: [
        {
          reps_completed: 10,
          completed: true
        }
      ]
    });

    const result = generatePlan({
      user,
      previousPlan
    });

    const benchPress = getExerciseByName(result, "Bench Press");

    expect(benchPress).toBeDefined();
    expect(benchPress?.current_weight).toBe(65);
  });

  it("should keep weight the same when previous exercise was partial because reps were below target", () => {
    const user = makeUser("beginner", 3);

    const previousPlan = makePreviousPlanForExercise("Bench Press", {
      currentWeight: 65,
      progressionStep: 5,
      targetSets: 2,
      targetReps: 10,
      logs: [
        {
          reps_completed: 9,
          completed: true
        },
        {
          reps_completed: 9,
          completed: true
        }
      ]
    });

    const result = generatePlan({
      user,
      previousPlan
    });

    const benchPress = getExerciseByName(result, "Bench Press");

    expect(benchPress).toBeDefined();
    expect(benchPress?.current_weight).toBe(65);
  });

  it("should keep weight the same when previous exercise was partial because completed was false", () => {
    const user = makeUser("beginner", 3);

    const previousPlan = makePreviousPlanForExercise("Bench Press", {
      currentWeight: 65,
      progressionStep: 5,
      targetSets: 2,
      targetReps: 10,
      logs: [
        {
          reps_completed: 10,
          completed: false
        },
        {
          reps_completed: 10,
          completed: false
        }
      ]
    });

    const result = generatePlan({
      user,
      previousPlan
    });

    const benchPress = getExerciseByName(result, "Bench Press");

    expect(benchPress).toBeDefined();
    expect(benchPress?.current_weight).toBe(65);
  });

  it("should reduce weight when previous exercise was missed", () => {
    const user = makeUser("beginner", 3);

    const previousPlan = makePreviousPlanForExercise("Bench Press", {
      currentWeight: 65,
      progressionStep: 5,
      targetSets: 2,
      targetReps: 10,
      logs: []
    });

    const result = generatePlan({
      user,
      previousPlan
    });

    const benchPress = getExerciseByName(result, "Bench Press");

    expect(benchPress).toBeDefined();
    expect(benchPress?.current_weight).toBe(60);
  });

  it("should not reduce weight below the progression step minimum", () => {
    const user = makeUser("beginner", 3);

    const previousPlan = makePreviousPlanForExercise("Bench Press", {
      currentWeight: 5,
      progressionStep: 5,
      targetSets: 2,
      targetReps: 10,
      logs: []
    });

    const result = generatePlan({
      user,
      previousPlan
    });

    const benchPress = getExerciseByName(result, "Bench Press");

    expect(benchPress).toBeDefined();
    expect(benchPress?.current_weight).toBe(5);
  });

  it("should fall back to default weight when previous plan exists but exercise name is not found", () => {
    const user = makeUser("beginner", 3);

    const previousPlan = makePreviousPlanForExercise("Some Other Exercise", {
      currentWeight: 200,
      progressionStep: 10,
      targetSets: 2,
      targetReps: 10,
      logs: [
        {
          reps_completed: 10,
          completed: true
        },
        {
          reps_completed: 10,
          completed: true
        }
      ]
    });

    const result = generatePlan({
      user,
      previousPlan
    });

    const benchPress = getExerciseByName(result, "Bench Press");

    expect(benchPress).toBeDefined();
    expect(benchPress?.current_weight).toBe(65);
  });

  it("should keep previous weight for Full Body exercise when logs do not qualify", () => {
    const user = makeUser("beginner", 3);

    const previousPlan = makePreviousPlanForExercise("Chest Press", {
      currentWeight: 70,
      progressionStep: 5,
      targetSets: 2,
      targetReps: 10,
      logs: [
        {
          reps_completed: 10,
          completed: true
        },
        {
          reps_completed: 7,
          completed: true
        }
      ]
    });

    const result = generatePlan({
      user,
      previousPlan
    });

    const chestPress = getExerciseByName(result, "Chest Press");

    expect(chestPress).toBeDefined();
    expect(chestPress?.current_weight).toBe(70);
  });

  it("should increase weight for Full Body exercise when logs qualify", () => {
    const user = makeUser("beginner", 3);

    const previousPlan = makePreviousPlanForExercise("Chest Press", {
      currentWeight: 70,
      progressionStep: 5,
      targetSets: 2,
      targetReps: 10,
      logs: [
        {
          reps_completed: 10,
          completed: true
        },
        {
          reps_completed: 10,
          completed: true
        }
      ]
    });

    const result = generatePlan({
      user,
      previousPlan
    });

    const chestPress = getExerciseByName(result, "Chest Press");

    expect(chestPress).toBeDefined();
    expect(chestPress?.current_weight).toBe(75);
  });

  it("should reduce weight for Full Body exercise when previous exercise was missed", () => {
    const user = makeUser("beginner", 3);

    const previousPlan = makePreviousPlanForExercise("Chest Press", {
      currentWeight: 70,
      progressionStep: 5,
      targetSets: 2,
      targetReps: 10,
      logs: []
    });

    const result = generatePlan({
      user,
      previousPlan
    });

    const chestPress = getExerciseByName(result, "Chest Press");

    expect(chestPress).toBeDefined();
    expect(chestPress?.current_weight).toBe(65);
  });
});