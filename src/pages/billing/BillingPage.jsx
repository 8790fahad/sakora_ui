import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useSearchParams } from "react-router-dom";
import { CreditCard, Check } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { openSquadCheckout } from "../../utils/squadCheckout";

const BillingPage = () => {
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const [interval, setInterval] = useState("month");
  const { data, isLoading } = useQuery("billing-plans", api.subscriptions.plans);
  const plans = data?.data?.plans || [];
  const current = data?.data?.current || {};
  const provider = data?.data?.provider || {};

  const checkout = useMutation(
    ({ plan, interval: nextInterval }) =>
      api.subscriptions.checkout(plan, nextInterval),
    {
      onSuccess: async (response) => {
        const payment = response.data.payment;
        if (payment.mock) {
          await api.subscriptions.verify({
            reference: payment.reference,
            mock: true,
          });
          toast.success("Subscription activated");
          queryClient.invalidateQueries("billing-plans");
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
            callbackUrl: `${window.location.origin}/billing?ref=${payment.reference}`,
          });
          if (result.success) {
            await api.subscriptions.verify({ reference: payment.reference });
            toast.success("Squad payment confirmed");
            queryClient.invalidateQueries("billing-plans");
          }
          return;
        }
        if (payment.checkoutUrl) {
          window.location.href = payment.checkoutUrl;
        }
      },
    }
  );

  const cancel = useMutation(api.subscriptions.cancel, {
    onSuccess: () => {
      toast.success("Moved to Starter plan");
      queryClient.invalidateQueries("billing-plans");
    },
  });

  useEffect(() => {
    const ref = params.get("ref");
    if (!ref) return;
    api.subscriptions
      .verify({ reference: ref, mock: params.get("mock") === "1" })
      .then(() => {
        toast.success("Squad payment confirmed");
        queryClient.invalidateQueries("billing-plans");
      })
      .catch(() => {});
  }, [params, queryClient]);

  const priceFor = (plan) =>
    interval === "year" ? plan.yearlyPrice || plan.price * 10 : plan.price;

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold">Billing</h1>
      <p className="text-slate-500 mb-6">
        Pay monthly or save with a yearly plan. Collections are processed by Squad.
        {provider.configured
          ? " Live/sandbox keys detected."
          : " Using local test checkout until Squad keys are added."}
      </p>

      <div className="mb-6 bg-teal-50 border border-teal-100 rounded-2xl p-4">
        Current plan:{" "}
        <strong className="capitalize">{current.plan || "free"}</strong>
        {current.expiry && (
          <span className="text-slate-500">
            {" "}
            · renews {new Date(current.expiry).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-full bg-slate-100 p-1">
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              interval === "month" ? "bg-white shadow" : "text-slate-500"
            }`}
            onClick={() => setInterval("month")}
          >
            Monthly
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              interval === "year" ? "bg-white shadow" : "text-slate-500"
            }`}
            onClick={() => setInterval("year")}
          >
            Yearly · save 25%
          </button>
        </div>
      </div>

      {isLoading && <p>Loading plans...</p>}

      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const amount = priceFor(plan);
          return (
            <div
              key={plan.key}
              className={`bg-white rounded-2xl border p-5 ${
                plan.popular ? "border-teal-500 shadow-md" : ""
              }`}
            >
              {plan.popular && (
                <p className="text-xs font-semibold text-teal-700 mb-2">
                  Most popular
                </p>
              )}
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <p className="text-3xl font-bold my-3">
                {amount === 0 ? "Free" : `₦${amount.toLocaleString()}`}
                {amount > 0 && (
                  <span className="text-sm font-normal text-slate-500">
                    /{interval === "year" ? "yr" : "mo"}
                  </span>
                )}
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
              {current.plan === plan.key ? (
                <button className="w-full py-2 rounded-xl bg-slate-100" disabled>
                  Current plan
                </button>
              ) : plan.price === 0 ? (
                <button
                  onClick={() => cancel.mutate()}
                  className="w-full py-2 rounded-xl border"
                >
                  Switch to Starter
                </button>
              ) : (
                <button
                  onClick={() =>
                    checkout.mutate({ plan: plan.key, interval })
                  }
                  className="w-full py-2 rounded-xl bg-teal-600 text-white flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Pay with Squad
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
