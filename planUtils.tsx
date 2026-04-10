import type { UserProfile, WeeklyPlan } from "./types";

export function getWeekStartISO(date: Date): string {
  const currentDay = date.getDay();
  let diffToMonday = 0;

  if (currentDay === 0) {
    diffToMonday = -6;
  } else {
    diffToMonday = 1 - currentDay;
  }

  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + diffToMonday);

  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, "0");
  const day = String(monday.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

export function isCurrentWeekPlan(plan: WeeklyPlan | null): boolean {
  if (!plan) {
    return false;
  }

  const currentWeekStart = getWeekStartISO(new Date());
  return plan.week_start === currentWeekStart;
}

export function shouldGenerateNewPlan(plan: WeeklyPlan | null): boolean {
  if (!plan) {
    return true;
  }

  return !isCurrentWeekPlan(plan);
}

export function didProfileChange(
  oldProfile: UserProfile,
  newProfile: UserProfile
): boolean {
  if (oldProfile.fitness_level !== newProfile.fitness_level) {
    return true;
  }

  if (
    oldProfile.available_days_per_week !== newProfile.available_days_per_week
  ) {
    return true;
  }

  return false;
}