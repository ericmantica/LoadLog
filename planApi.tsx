import type { LoadLogAPI, PlanGenerationOutput } from "./types";

export async function createPlan(api: LoadLogAPI, input: PlanGenerationOutput) {
  return await api.plans.createPlan(input);
}

export async function getCurrentPlan(api: LoadLogAPI, userId: string) {
  return await api.plans.getCurrentPlan(userId);
}

export async function getPlanDetails(api: LoadLogAPI, planId: string) {
  return await api.plans.getPlanWithDetails(planId);
}