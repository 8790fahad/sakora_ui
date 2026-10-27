import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { openSquadCheckout } from "../../utils/squadCheckout";
import { BILLING_MONTHS, billingMonths } from "../../utils/billingNext";
import { hasActivePlan } from "../../utils/planAccess";

const FALLBACK_TERMS = [
  { months: 1, label: "1 month", bestValue: false },
  { months: 12, label: "12 months", bestValue: false },
  { months: 24, label: "24 months", bestValue: false },
  { months: 48, label: "48 months", bestValue: true },
];

const money = (amount) => `₦${Number(amount || 0).toLocaleString()}`;

const PeriodSelect = ({ terms, months, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = terms.find((term) => term.months === months) || terms[0];

  useEffect(() => {
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left font-medium ${
          open ? "border-teal-500 ring-2 ring-teal-100" : "border-slate-200"
        }`}
      >
        <span>{current?.label}</span>
        <ChevronDown className={`h-4 w-4 text-slate-500 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {terms.map((term) => (
            <button
              key={term.months}
              type="button"
              onClick={() => {
                onChange(term.months);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50 ${
                term.months === months ? "bg-slate-50" : ""
              }`}
            >
              <span>{term.label}</span>
              {term.bestValue ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  Best value
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const BillingPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [applied, setApplied] = useState(null);
  const [months, setMonths] = useState(() => billingMonths(params.get("months")));
  const [selectedKey, setSelectedKey] = useState(params.get("plan") || "growth");
  const checkedRef = useRef("");
  const summaryRef = useRef(null);
  const fromSignup = params.get("signup") === "1";
  const { data, isLoading } = useQuery("billing-plans", api.subscriptions.plans);
  const plans = data?.data?.plans || [];
  const terms = data?.data?.terms?.length ? data.data.terms : FALLBACK_TERMS;
  const current = data?.data?.current || {};
  const provider = data?.data?.provider || {};
  const planActive = hasActivePlan(current.plan, current.expiry);
  const selected = plans.find((plan) => plan.key === selectedKey) || plans[0];
  const quote = selected?.quotes?.find((item) => Number(item.months) === Number(months));
  const couponQuote =
    applied && Number(applied.months) === Number(months) && applied.plan === selected?.key
      ? applied
      : null;
  const due = couponQuote ? couponQuote.amount : quote?.amount;

  const rememberPaidPlan = (paid) => {
    if (!paid?.plan || !paid?.expiry) return;
    queryClient.setQueryData("billing-plans", (previous) => {
      if (!previous?.data) return previous;
      return {
        ...previous,
        data: {
          ...previous.data,
          current: {
            ...previous.data.current,
            plan: paid.plan,
            expiry: paid.expiry,
            status: "active",
          },
        },
      };
    });
  };

  const checkout = useMutation(
    ({ plan, months: termMonths, coupon: couponCode }) =>
      api.subscriptions.checkout(
        plan,
        termMonths,
        `${window.location.origin}/billing${fromSignup ? "?signup=1" : ""}`,
        couponCode
      ),
    {
      onSuccess: async (response) => {
        if (response?.data?.activated) {
          rememberPaidPlan(response.data);
          toast.success("Coupon applied. Your plan is active.");
          queryClient.invalidateQueries("billing-plans");
          queryClient.invalidateQueries("settings");
          navigate("/dashboard", { replace: true });
          return;
        }
        const payment = response?.data?.payment;
        if (!payment) {
          toast.error("Squad did not return a checkout link");
          return;
        }
        if (payment.mock) {
          const verified = await api.subscriptions.verify({
            reference: payment.reference,
            mock: true,
          });
          rememberPaidPlan(verified?.data);
          toast.success("Subscription activated");
          queryClient.invalidateQueries("billing-plans");
          queryClient.invalidateQueries("settings");
          navigate("/dashboard", { replace: true });
          return;
        }
        if (payment.checkoutUrl) {
          window.location.assign(payment.checkoutUrl);
          return;
        }
        if (payment.publicKey) {
          const result = await openSquadCheckout({
            publicKey: payment.publicKey,
            email: payment.email,
            amount: payment.amount,
            currency: payment.currency || "NGN",
            transactionRef: payment.reference,
            customerName: payment.customerName,
            callbackUrl: `${window.location.origin}/billing?ref=${payment.reference}${fromSignup ? "&signup=1" : ""}`,
          });
          if (result.success) {
            await confirmPayment(payment.reference);
          } else if (result.closed) {
            toast("Payment was not completed");
          }
        }
      },
      onError: (error) => {
        toast.error(error.message || "Could not start the payment");
      },
    }
  );

  const applyCoupon = useMutation(
    () =>
      api.subscriptions.quote({
        plan: selected.key,
        months,
        coupon: coupon.trim(),
      }),
    {
      onSuccess: (response) => {
        setApplied(response?.data || null);
        toast.success(
          response?.data?.amount === 0
            ? "Coupon covers the full term."
            : "Coupon applied."
        );
      },
      onError: () => {
        setApplied(null);
      },
    }
  );

  const cancel = useMutation(api.subscriptions.cancel, {
    onSuccess: () => {
      toast.success("Plan cancelled");
      queryClient.invalidateQueries("billing-plans");
      queryClient.invalidateQueries("settings");
    },
  });

  const confirmPayment = async (reference, mock = false) => {
    setCheckingPayment(true);
    try {
      const response = await api.subscriptions.verify({
        reference,
        mock,
      });
      if (response?.data?.pending) {
        toast("Payment is still pending. Finish it on Squad, then come back.");
        return;
      }
      toast.success(
        response?.data?.alreadyActive
          ? "This plan is already active"
          : "Squad payment confirmed"
      );
      rememberPaidPlan(response?.data);
      queryClient.invalidateQueries("billing-plans");
      queryClient.invalidateQueries("settings");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      toast.error(error.message || "Could not confirm the Squad payment");
    } finally {
      setCheckingPayment(false);
    }
  };

  useEffect(() => {
    const ref =
      params.get("ref") ||
      params.get("transaction_ref") ||
      params.get("reference");
    if (!ref || checkedRef.current === ref) return;
    checkedRef.current = ref;
    confirmPayment(ref, params.get("mock") === "1");
    // confirmPayment identity changes each render; the ref guard runs this once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    if (!plans.length) return;
    if (!plans.some((plan) => plan.key === selectedKey)) {
      setSelectedKey(plans.find((plan) => plan.popular)?.key || plans[0].key);
    }
  }, [plans, selectedKey]);

  const choosePlan = (key) => {
    setSelectedKey(key);
    summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const periodLabel = quote?.label || `${months} months`;
  const termMonths = BILLING_MONTHS.includes(Number(months)) ? Number(months) : 48;

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold">
        {planActive ? "Billing" : "Choose a plan"}
      </h1>
      <p className="text-slate-500 mb-6 max-w-2xl">
        {planActive
          ? "Renew or change your plan. "
          : "A plan is required before you can use Sakora. "}
        Starter is {money(4000)} a month, Growth is {money(12000)}, and Business is{" "}
        {money(20000)}. Pay for 1, 12, 24, or 48 months. A longer term costs less each month.
        {provider.configured
          ? ""
          : " Using local test checkout until Squad keys are added."}
      </p>

      {checkingPayment && (
        <div className="mb-4 bg-white border rounded-2xl p-4 text-sm text-slate-600">
          Confirming your Squad payment...
        </div>
      )}

      <div className="mb-6 bg-teal-50 border border-teal-100 rounded-2xl p-4">
        Current plan: <strong>{current.planName || "No plan"}</strong>
        {current.expiry && current.plan && current.plan !== "free" && (
          <span className="text-slate-500">
            {" "}
            · renews {new Date(current.expiry).toLocaleDateString()}
          </span>
        )}
        {current.plan && current.plan !== "free" && (
          <button
            type="button"
            onClick={() => cancel.mutate()}
            disabled={cancel.isLoading}
            className="block mt-3 text-sm text-slate-500 underline"
          >
            Cancel plan
          </button>
        )}
      </div>

      {isLoading && <p>Loading plans...</p>}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const priced = plan.quotes?.find((item) => Number(item.months) === termMonths);
          const active = selected?.key === plan.key;
          return (
            <button
              key={plan.key}
              type="button"
              onClick={() => choosePlan(plan.key)}
              className={`bg-white rounded-2xl border p-5 text-left ${
                active ? "border-teal-500 shadow-md" : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  {plan.popular && (
                    <p className="text-xs font-semibold text-teal-700 mb-1">Most popular</p>
                  )}
                  <h2 className="text-xl font-semibold">{plan.name}</h2>
                </div>
                {priced?.percentOff > 0 && (
                  <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-600">
                    {priced.percentOff}% off
                  </span>
                )}
              </div>
              {priced ? (
                <p className="my-3">
                  {priced.save > 0 && (
                    <span className="block text-sm text-slate-400 line-through">
                      {money(priced.listPerMonth)}/mo
                    </span>
                  )}
                  <span className="text-3xl font-bold">
                    {money(priced.perMonth)}
                    <span className="text-sm font-normal text-slate-500">/mo</span>
                  </span>
                </p>
              ) : (
                <p className="text-3xl font-bold my-3">
                  {money(plan.price)}
                  <span className="text-sm font-normal text-slate-500">/mo</span>
                </p>
              )}
              <p className="text-sm text-slate-500 mb-4">
                {priced
                  ? `Today you pay ${money(priced.amount)} for ${priced.months} months. Cancel anytime.`
                  : plan.description}
              </p>
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              {planActive && current.plan === plan.key && (
                <p className="mt-4 text-sm font-medium text-teal-700">Current plan</p>
              )}
            </button>
          );
        })}
      </div>

      {selected && quote && (
        <div ref={summaryRef} className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-lg font-semibold">{selected.name}</h2>
            <p className="text-sm text-slate-500 mb-5">{selected.description}</p>
            <p className="text-sm font-medium mb-2">Period</p>
            <PeriodSelect
              terms={terms}
              months={termMonths}
              onChange={(next) => {
                setMonths(next);
                setApplied(null);
              }}
            />
            <p className="mt-3 text-sm text-slate-500">
              for {quote.months} {quote.months === 1 ? "month" : "months"}. Cancel anytime.
            </p>
            <div className="mt-6 flex items-end justify-between gap-4">
              <div>
                {quote.save > 0 && (
                  <p className="text-sm font-semibold text-red-600">Save {money(quote.save)}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">
                  {money(quote.perMonth)}
                  <span className="text-base font-normal text-slate-500">/mo</span>
                </p>
                {quote.save > 0 && (
                  <p className="text-sm text-slate-400 line-through">
                    {money(quote.listPerMonth)}/mo
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-lg font-semibold mb-4">Order summary</h2>
            <div className="flex items-start justify-between gap-4 text-sm">
              <div>
                <p className="font-medium">{selected.name}</p>
                <p className="text-slate-500">{periodLabel} period</p>
              </div>
              <div className="text-right">
                {quote.save > 0 && (
                  <p className="text-slate-400 line-through">{money(quote.listPrice)}</p>
                )}
                <p className="font-medium">{money(quote.amount)}</p>
              </div>
            </div>
            {couponQuote?.coupon && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <p className="text-teal-700">Coupon {couponQuote.coupon}</p>
                <p className="text-teal-700">−{money(couponQuote.discount || 0)}</p>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <p className="font-semibold">Total</p>
              <div className="text-right">
                {quote.listPrice > due && (
                  <p className="text-sm text-slate-400 line-through">{money(quote.listPrice)}</p>
                )}
                <p className="text-xl font-bold">{money(due)}</p>
              </div>
            </div>

            {couponOpen ? (
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  className="w-full border rounded-xl px-3 py-2 uppercase"
                  placeholder="Coupon code"
                  value={coupon}
                  onChange={(event) => setCoupon(event.target.value.toUpperCase())}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => applyCoupon.mutate()}
                  disabled={!coupon.trim() || applyCoupon.isLoading}
                  className="rounded-xl border border-teal-600 px-4 text-sm font-semibold text-teal-700 disabled:opacity-50"
                >
                  {applyCoupon.isLoading ? "Checking..." : "Apply"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCouponOpen(true)}
                className="mt-4 text-sm font-semibold text-teal-700"
              >
                Have a coupon code?
              </button>
            )}
            <p className="mt-2 text-xs text-slate-400">
              A 100% coupon starts the plan with no payment.
            </p>

            <button
              type="button"
              onClick={() =>
                checkout.mutate({
                  plan: selected.key,
                  months: termMonths,
                  coupon: couponQuote?.coupon || undefined,
                })
              }
              disabled={checkout.isLoading || due == null}
              className="mt-5 w-full rounded-xl bg-teal-600 py-3 font-semibold text-white disabled:opacity-60"
            >
              {checkout.isLoading ? "Continuing..." : "Continue"}
            </button>
            <p className="mt-3 text-xs text-slate-500">
              Today you pay {money(due)} for {quote.months} months. Cancel anytime.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPage;
