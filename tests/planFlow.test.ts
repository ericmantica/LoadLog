import { describe, expect, it } from "vitest";
import { getExtraUnloggedWorkoutDayNumbers } from "../planFlow";
import type { LoggedSet, PlanWithDetails } from "../types";

function makeLogs(count: number): LoggedSet[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `log-${index + 1}`,
    exercise_id: "exercise-1",
    set_number: index + 1,
    reps_completed: 10,
    weight_used: 50,
    completed: true,
    logged_at: "2026-04-27T10:00:00.000Z",
  }));
}

function makeCurrentPlan(): PlanWithDetails {
  return {
    id: "plan-1",
    user_id: "user-1",
    week_start: "2026-04-27",
    status: "active",
    created_at: "2026-04-27T00:00:00.000Z",
    days: [
      {
        id: "day-1",
        plan_id: "plan-1",
        day_number: 1,
        muscle_group: "Upper Body",
        status: "completed",
        scheduled_date: "2026-04-27",
        exercises: [
          {
            id: "exercise-1",
            workout_day_id: "day-1",
            name: "Bench Press",
            target_sets: 2,
            target_reps: 10,
            current_weight: 45,
            progression_step: 5,
            logs: makeLogs(2),
          },
        ],
      },
      {
        id: "day-2",
        plan_id: "plan-1",
        day_number: 2,
        muscle_group: "Pull",
        status: "scheduled",
        scheduled_date: "2026-04-28",
        exercises: [
          {
            id: "exercise-2",
            workout_day_id: "day-2",
            name: "Lat Pulldown",
            target_sets: 2,
            target_reps: 10,
            current_weight: 40,
            progression_step: 2.5,
            logs: [],
          },
        ],
      },
      {
        id: "day-3",
        plan_id: "plan-1",
        day_number: 3,
        muscle_group: "Rest",
        status: "scheduled",
        scheduled_date: "2026-04-29",
        exercises: [],
      },
    ],
  };
}

describe("getExtraUnloggedWorkoutDayNumbers", () => {
  it("converts extra unlogged workout days when the new preference wants rest", () => {
    const currentPlan = makeCurrentPlan();
    const desiredDays = [
      {
        id: "desired-1",
        plan_id: "plan-1",
        day_number: 1,
        muscle_group: "Rest",
        status: "scheduled" as const,
        scheduled_date: "2026-04-27",
        exercises: [],
      },
      {
        id: "desired-2",
        plan_id: "plan-1",
        day_number: 2,
        muscle_group: "Rest",
        status: "scheduled" as const,
        scheduled_date: "2026-04-28",
        exercises: [],
      },
      {
        id: "desired-3",
        plan_id: "plan-1",
        day_number: 3,
        muscle_group: "Rest",
        status: "scheduled" as const,
        scheduled_date: "2026-04-29",
        exercises: [],
      },
    ];

    expect(getExtraUnloggedWorkoutDayNumbers(currentPlan, desiredDays)).toEqual([2]);
  });

  it("does not convert preserved logged workout days even if the new preference wants rest", () => {
    const currentPlan = makeCurrentPlan();
    const desiredDays = [
      {
        id: "desired-1",
        plan_id: "plan-1",
        day_number: 1,
        muscle_group: "Rest",
        status: "scheduled" as const,
        scheduled_date: "2026-04-27",
        exercises: [],
      },
      {
        id: "desired-2",
        plan_id: "plan-1",
        day_number: 2,
        muscle_group: "Pull",
        status: "scheduled" as const,
        scheduled_date: "2026-04-28",
        exercises: [],
      },
      {
        id: "desired-3",
        plan_id: "plan-1",
        day_number: 3,
        muscle_group: "Rest",
        status: "scheduled" as const,
        scheduled_date: "2026-04-29",
        exercises: [],
      },
    ];

    expect(getExtraUnloggedWorkoutDayNumbers(currentPlan, desiredDays)).toEqual([]);
  });
});
