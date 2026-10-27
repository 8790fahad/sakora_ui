const STORAGE_KEY = "sakora.billing.next";

export const SIGNUP_PLANS = [
  { key: "starter", name: "Starter", price: 4000 },
  { key: "growth", name: "Growth", price: 12000 },
  { key: "business", name: "Business", price: 20000 },
];

export const isSignupPlan = (key) =>
  SIGNUP_PLANS.some((plan) => plan.key === key);

export const signupBillingPath = (plan) => {
  const params = new URLSearchParams({ plan, signup: "1" });
  return `/billing?${params.toString()}`;
};

export const rememberSignupPlan = (plan) => {
  if (!isSignupPlan(plan)) return;
  sessionStorage.setItem(STORAGE_KEY, signupBillingPath(plan));
};

export const safeBillingNext = (value) => {
  if (!value || typeof value !== "string") return "";
  let path = value.trim();
  try {
    path = decodeURIComponent(path);
  } catch (error) {
    return "";
  }
  if (!path.startsWith("/billing") || path.startsWith("//") || path.includes("://")) {
    return "";
  }
  return path;
};

export const planFromSearch = (search = "") => {
  const params = new URLSearchParams(
    String(search).startsWith("?") ? String(search).slice(1) : String(search)
  );
  if (isSignupPlan(params.get("plan"))) return params.get("plan");
  const next = safeBillingNext(params.get("next") || "");
  const nested = new URLSearchParams(next.split("?")[1] || "").get("plan");
  return isSignupPlan(nested) ? nested : "";
};

export const rememberBillingNext = (search = "") => {
  const params = new URLSearchParams(
    String(search).startsWith("?") ? String(search).slice(1) : String(search)
  );
  const next = safeBillingNext(params.get("next") || "");
  if (next) sessionStorage.setItem(STORAGE_KEY, next);
};

export const takeBillingNext = () => {
  const next = safeBillingNext(sessionStorage.getItem(STORAGE_KEY) || "");
  sessionStorage.removeItem(STORAGE_KEY);
  return next;
};
