import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import {
  Copy,
  Check,
  Gift,
  Link2,
  Users,
  Wallet,
  Share2,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";

const money = (value) =>
  `₦${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const ReferralsPage = () => {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(null);
  const { data, isLoading } = useQuery("referrals", api.referrals.get);
  const program = data?.data || {};
  const summary = program.summary || {};
  const referrals = program.referrals || [];
  const commissions = program.commissions || [];

  const payout = useMutation(
    () => api.referrals.requestPayout(),
    {
      onSuccess: (response) => {
        toast.success(response.message || "Payout request submitted");
        queryClient.invalidateQueries("referrals");
      },
      onError: (error) => {
        toast.error(error.message || "Could not request payout");
      },
    }
  );

  const stats = useMemo(
    () => [
      {
        label: "Referrals",
        value: summary.referralCount || 0,
        icon: Users,
        tone: "bg-teal-50 text-teal-700",
      },
      {
        label: "Earned",
        value: money(summary.earned),
        icon: Gift,
        tone: "bg-emerald-50 text-emerald-700",
      },
      {
        label: "Available",
        value: money(summary.available),
        icon: Wallet,
        tone: "bg-amber-50 text-amber-700",
      },
      {
        label: "Paid out",
        value: money(summary.paid),
        icon: Check,
        tone: "bg-slate-100 text-slate-700",
      },
    ],
    [summary]
  );

  const copyText = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast.success("Copied");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  const shareLink = async () => {
    const url = program.referralLink;
    if (!url) return;
    const shareData = {
      title: "Join Sakora",
      text: `Use my referral code ${program.code} to sign up on Sakora and grow your business.`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await copyText(url, "link");
    } catch {
      // user cancelled share
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 flex justify-center py-20">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Referrals</h1>
        <p className="text-slate-500 mt-1">
          Invite other businesses and earn{" "}
          <strong>{program.commissionRate ?? 20}%</strong> commission when they
          subscribe to a paid plan.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div
                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${stat.tone}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">
                {stat.label}
              </p>
              <p className="text-xl font-semibold text-slate-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1 space-y-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-teal-800">
                Your referral code
              </label>
              <div className="mt-1 flex items-center gap-2">
                <code className="text-2xl font-bold tracking-wider text-teal-900">
                  {program.code || "—"}
                </code>
                <button
                  type="button"
                  onClick={() => copyText(program.code, "code")}
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-sm text-teal-800 border border-teal-200 hover:bg-teal-50"
                >
                  {copied === "code" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Copy
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-teal-800">
                Referral link
              </label>
              <div className="mt-1 flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center gap-2 rounded-xl bg-white border border-teal-200 px-3 py-2.5 text-sm text-slate-700 break-all">
                  <Link2 className="h-4 w-4 shrink-0 text-teal-600" />
                  {program.referralLink || "—"}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => copyText(program.referralLink, "link")}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-teal-800 border border-teal-200 hover:bg-teal-50"
                  >
                    {copied === "link" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Copy link
                  </button>
                  <button
                    type="button"
                    onClick={shareLink}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-3 py-2.5 text-sm font-medium text-white hover:bg-teal-800"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="md:w-56 shrink-0">
            <button
              type="button"
              disabled={
                payout.isLoading || !(Number(summary.available) > 0)
              }
              onClick={() => payout.mutate()}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {payout.isLoading ? "Requesting…" : "Request payout"}
            </button>
            <p className="mt-2 text-xs text-teal-900/70 text-center md:text-left">
              Available balance is paid manually after you request it.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Referred businesses</h2>
          </div>
          {referrals.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">
              No referrals yet. Share your link to get started.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {referrals.map((item) => (
                <li
                  key={item.id}
                  className="px-5 py-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      Joined{" "}
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                    {item.subscriptionPlan || "free"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Commissions</h2>
          </div>
          {commissions.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">
              Commissions appear when a referred business pays for a plan.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {commissions.map((item) => (
                <li
                  key={item.id}
                  className="px-5 py-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {item.referred?.name || "Business"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.metadata?.plan || "plan"} ·{" "}
                      {new Date(item.createdAt).toLocaleDateString()} ·{" "}
                      <span className="capitalize">{item.status}</span>
                    </p>
                  </div>
                  <span className="font-semibold text-emerald-700">
                    {money(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default ReferralsPage;
