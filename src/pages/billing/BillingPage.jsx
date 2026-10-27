import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CreditCard, Check } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { openSquadCheckout } from "../../utils/squadCheckout";
import { hasActivePlan } from "../../utils/planAccess";

const BillingPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [coupon, setCoupon] = useState("");
  const checkedRef = useRef("");
  const startedSignupPay = useRef(false);
  const fromSignup = params.get("signup") === "1";
  const { data, isLoading } = useQuery("billing-plans", api.subscriptions.plans);
  const plans = data?.data?.plans || [];
  const current = data?.data?.current || {};
  const provider = data?.data?.provider || {};
  const planActive = hasActivePlan(current.plan, current.expiry);

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
    ({ plan, amount, coupon: couponCode }) =>
      api.subscriptions.checkout(
        plan,
        "month",
        `${window.location.origin}/billing${fromSignup ? "?signup=1" : ""}`,
        amount,
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
    if (!fromSignup || isLoading || startedSignupPay.current) return;
    if (
      params.get("ref") ||
      params.get("transaction_ref") ||
      params.get("reference")
    ) {
      return;
    }
    const plan = plans.find((item) => item.key === params.get("plan"));
    if (!plan || (planActive && current.plan === plan.key)) return;
    startedSignupPay.current = true;
    checkout.mutate({ plan: plan.key });
  }, [fromSignup, isLoading, plans, current.plan, params, checkout, planActive]);

  const requestedPlan = params.get("plan") || "";
  const money = (amount) => `₦${Number(amount || 0).toLocaleString()}`;

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold">
        {planActive ? "Billing" : "Choose a plan"}
      </h1>
      <p className="text-slate-500 mb-6">
        {planActive
          ? "Starter is ₦4,000 a month, Growth is ₦12,000, and Business is ₦20,000."
          : "A plan is required before you can use Sakora. Starter is ₦4,000 a month, Growth is ₦12,000, and Business is ₦20,000."}{" "}
        Payment is with Squad.
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
        Current plan:{" "}
        <strong>{current.planName || "No plan"}</strong>
        {current.plan === "custom" && current.amount ? (
          <span className="text-slate-500"> · {money(current.amount)}/mo</span>
        ) : null}
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

      <label className="mb-6 block max-w-sm text-sm text-slate-600">
        Coupon
        <input
          type="text"
          className="mt-1 w-full border rounded-xl px-3 py-2 uppercase"
          placeholder="Enter a coupon"
          value={coupon}
          onChange={(event) => setCoupon(event.target.value.toUpperCase())}
          autoComplete="off"
        />
        <span className="mt-1 block text-xs text-slate-400">
          A 100% coupon starts the plan with no payment.
        </span>
      </label>

      {isLoading && <p>Loading plans...</p>}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const selected = requestedPlan === plan.key;
          return (
            <div
              key={plan.key}
              className={`bg-white rounded-2xl border p-5 ${
                plan.popular || selected ? "border-teal-500 shadow-md" : ""
              }`}
            >
              {plan.popular && (
                <p className="text-xs font-semibold text-teal-700 mb-2">
                  Most popular
                </p>
              )}
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <p className="text-3xl font-bold my-3">
                {money(plan.price)}
                <span className="text-sm font-normal text-slate-500">/mo</span>
              </p>
              <p className="text-sm text-slate-500 mb-4">{plan.description}</p>
              <ul className="space-y-2 mb-5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-teal-600 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
              {planActive && current.plan === plan.key ? (
                <button className="w-full py-2 rounded-xl bg-slate-100" disabled>
                  Current plan
                </button>
              ) : (
                <button
                  onClick={() =>
                    checkout.mutate({
                      plan: plan.key,
                      coupon: coupon.trim() || undefined,
                    })
                  }
                  disabled={checkout.isLoading}
                  className="w-full py-2 rounded-xl bg-teal-600 text-white flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <CreditCard className="w-4 h-4" />
                  {checkout.isLoading && checkout.variables?.plan === plan.key
                    ? coupon.trim()
                      ? "Applying coupon..."
                      : "Opening Squad..."
                    : coupon.trim()
                      ? "Apply coupon"
                      : "Pay with Squad"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BillingPage;
