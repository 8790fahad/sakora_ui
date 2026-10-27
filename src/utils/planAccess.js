const PAID_PLANS = new Set([
  "starter",
  "growth",
  "business",
  "custom",
  "basic",
  "premium",
]);

export const hasActivePlan = (plan, expiry) => {
  if (!PAID_PLANS.has(String(plan || ""))) return false;
  const ends = new Date(expiry || 0).getTime();
  return Number.isFinite(ends) && ends > Date.now();
};
