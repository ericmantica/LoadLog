import type {
  HistoricalExerciseSession,
  LoadLogAPI,
  UserProfile,
  PlanGenerationInput,
  PlanWithDetails
} from "./types";
import { generatePlan } from "./planner";
import { createPlan, getCurrentPlan, getPlanDetails } from "./planApi";
import { isCurrentWeekPlan } from "./planUtils";

function getTodayISO(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function hasAnyLogs(day: PlanWithDetails["days"][number]): boolean {
  for (let i = 0; i < day.exercises.length; i++) {
    if ((day.exercises[i].logs ?? []).length > 0) {
      return true;
    }
  }

  return false;
}

function buildRegenerationMessage(
  regenerateDayNumbers: number[],
  todayFrozen: boolean
): string {
  if (regenerateDayNumbers.length === 0) {
    if (todayFrozen) {
      return "Today's logged workout was preserved. No remaining future days needed regeneration.";
    }

    return "No days were regenerated.";
  }

  if (todayFrozen) {
    return "Today's logged workout was preserved. Future days were regenerated.";
  }

  return "Today and future days were regenerated.";
}

async function loadHistoricalSessions(
  api: LoadLogAPI,
  userId: string
): Promise<HistoricalExerciseSession[]> {
  return await api.stats.getHistoricalExerciseSessions(userId);
}

function getUsableHistoricalSessions(
  sessions: HistoricalExerciseSession[],
  todayISO: string
): HistoricalExerciseSession[] {
  return sessions.filter(
    (session) =>
      session.scheduled_date < todayISO ||
      (session.scheduled_date === todayISO && session.logs.length > 0)
  );
}

export async function loadExistingPlanForUser(
  api: LoadLogAPI,
  userId: string
): Promise<PlanWithDetails | null> {
  const currentPlan = await api.plans.getCurrentPlan(userId);

  if (!currentPlan) {
    return null;
  }

  const fullPlan = await api.plans.getPlanWithDetails(currentPlan.id);
  return fullPlan;
}

export async function generateAndSavePlan(
  api: LoadLogAPI,
  user: UserProfile,
  previousPlan?: PlanGenerationInput["previousPlan"],
  historicalSessions?: HistoricalExerciseSession[]
): Promise<PlanWithDetails> {
  const output = generatePlan({
    user,
    previousPlan,
    historical_sessions: historicalSessions,
  });

  const createdPlan = await api.plans.createPlan(output);
  const fullPlan = await api.plans.getPlanWithDetails(createdPlan.id);

  return fullPlan;
}

export async function generatePlanIfNeeded(
  api: LoadLogAPI,
  user: UserProfile,
  previousPlan?: PlanGenerationInput["previousPlan"]
): Promise<{
  plan: PlanWithDetails;
  createdNew: boolean;
}> {
  const currentPlan = await api.plans.getCurrentPlan(user.id);
  const todayISO = getTodayISO();

  if (currentPlan && isCurrentWeekPlan(currentPlan)) {
    const existingFullPlan = await api.plans.getPlanWithDetails(currentPlan.id);

    return {
      plan: existingFullPlan,
      createdNew: false
    };
  }

  let priorPlan = previousPlan;

  if (!priorPlan && currentPlan) {
    priorPlan = await api.plans.getPlanWithDetails(currentPlan.id);
  }

  const historicalSessions = getUsableHistoricalSessions(
    await loadHistoricalSessions(api, user.id),
    todayISO
  );
  const createdPlan = await generateAndSavePlan(
    api,
    user,
    priorPlan,
    historicalSessions
  );

  return {
    plan: createdPlan,
    createdNew: true
  };
}

export async function generateOrRegeneratePlan(
  api: LoadLogAPI,
  user: UserProfile
): Promise<{ plan: PlanWithDetails; message: string }> {
  const currentPlan = await api.plans.getCurrentPlan(user.id);

  if (!currentPlan || !isCurrentWeekPlan(currentPlan)) {
    const result = await generatePlanIfNeeded(api, user);

    return {
      plan: result.plan,
      message: result.createdNew
        ? "New plan generated and saved."
        : "This week already has a plan. Showing the existing plan.",
    };
  }

  return await regeneratePlan(api, user);
}


export async function loadPlanOnStart(
  api: LoadLogAPI,
  userId: string
): Promise<PlanWithDetails | null> {
  const current = await getCurrentPlan(api, userId);

  if (!current) {
    return null;
  }

  return await getPlanDetails(api, current.id);
}

/*export async function generatePlanIfNeeded(
  api: LoadLogAPI,
  user: UserProfile,
  previousPlan?: PlanGenerationInput["previousPlan"]
): Promise<{ plan: PlanWithDetails; created: boolean }> {
  const existing = await getCurrentPlan(api, user.id);

  if (existing && isCurrentWeekPlan(existing)) {
    const full = await getPlanDetails(api, existing.id);

    return {
      plan: full,
      created: false
    };
  }

  const output = generatePlan({
    user,
    previousPlan
  });

  const createdPlan = await createPlan(api, output);
  const fullPlan = await getPlanDetails(api, createdPlan.id);

  return {
    plan: fullPlan,
    created: true
  };
}*/

export async function regeneratePlan(
  api: LoadLogAPI,
  user: UserProfile
): Promise<{ plan: PlanWithDetails; message: string }> {
  const currentPlan = await api.plans.getCurrentPlan(user.id);
  const todayISO = getTodayISO();

  if (!currentPlan || !isCurrentWeekPlan(currentPlan)) {
    const historicalSessions = getUsableHistoricalSessions(
      await loadHistoricalSessions(api, user.id),
      todayISO
    );
    const output = generatePlan({
      user,
      previousPlan: undefined,
      historical_sessions: historicalSessions,
    });

    const createdPlan = await createPlan(api, output);

    return {
      plan: await getPlanDetails(api, createdPlan.id),
      message: "A new weekly plan was generated.",
    };
  }

  const currentPlanDetails = await api.plans.getPlanWithDetails(currentPlan.id);
  const historicalSessions = getUsableHistoricalSessions(
    await loadHistoricalSessions(api, user.id),
    todayISO
  );
  const todayDay =
    currentPlanDetails.days.find((day) => day.scheduled_date === todayISO) ?? null;
  const todayFrozen = !!todayDay && hasAnyLogs(todayDay);

  const regenerateDayNumbers = currentPlanDetails.days
    .filter((day) => {
      if (day.scheduled_date < todayISO) {
        return false;
      }

      if (day.scheduled_date === todayISO && todayFrozen) {
        return false;
      }

      if (hasAnyLogs(day)) {
        return false;
      }

      return true;
    })
    .map((day) => day.day_number);

  if (regenerateDayNumbers.length === 0) {
    return {
      plan: currentPlanDetails,
      message: buildRegenerationMessage(regenerateDayNumbers, todayFrozen),
    };
  }

  const output = generatePlan({
    user,
    week_start: currentPlan.week_start,
    day_numbers: regenerateDayNumbers,
    previousPlan: currentPlanDetails,
    historical_sessions: historicalSessions,
  });

  await api.plans.replacePlanDays(currentPlan.id, output.days);

  return {
    plan: await getPlanDetails(api, currentPlan.id),
    message: buildRegenerationMessage(regenerateDayNumbers, todayFrozen),
  };
}
