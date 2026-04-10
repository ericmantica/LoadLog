import type {
  LoadLogAPI,
  UserProfile,
  PlanGenerationInput,
  PlanWithDetails
} from "./types";
import { generatePlan } from "./planner";
import { createPlan, getCurrentPlan, getPlanDetails } from "./planApi";
import { isCurrentWeekPlan } from "./planUtils";

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
  previousPlan?: PlanGenerationInput["previousPlan"]
): Promise<PlanWithDetails> {
  const output = generatePlan({
    user,
    previousPlan
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

  if (currentPlan && isCurrentWeekPlan(currentPlan)) {
    const existingFullPlan = await api.plans.getPlanWithDetails(currentPlan.id);

    return {
      plan: existingFullPlan,
      createdNew: false
    };
  }

  const createdPlan = await generateAndSavePlan(api, user, previousPlan);

  return {
    plan: createdPlan,
    createdNew: true
  };
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
): Promise<PlanWithDetails> {
  const output = generatePlan({
    user,
    previousPlan: undefined
  });

  const createdPlan = await createPlan(api, output);
  return await getPlanDetails(api, createdPlan.id);
}