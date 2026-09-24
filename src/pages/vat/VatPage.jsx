import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Percent,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Landmark,
  CheckCircle2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import api from "../../services/api";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(parseFloat(amount || 0));

const today = () => new Date().toISOString().split("T")[0];
const monthStart = () => {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().split("T")[0];
};

const VatPage = () => {
  const queryClient = useQueryClient();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [payment, setPayment] = useState({
    amount: "",
    date: today(),
    paymentMethod: "bank",
    reference: "",
    notes: "",
  });

  const { data, isLoading } = useQuery(
    ["vat-summary", from, to],
    () => api.vat.summary({ from, to }),
    { keepPreviousData: true }
  );

  const summary = data?.data || {};
  const setup = summary.setup || {};
  const netPayable = parseFloat(summary.netPayable || 0);

  const payMutation = useMutation((payload) => api.vat.pay(payload), {
    onSuccess: () => {
      toast.success("VAT payment recorded. Payable is now net of this amount.");
      setPayment({
        amount: "",
        date: today(),
        paymentMethod: "bank",
        reference: "",
        notes: "",
      });
      queryClient.invalidateQueries("vat-summary");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to record VAT payment");
    },
  });

  const suggestedAmount = useMemo(
    () => (netPayable > 0 ? netPayable.toFixed(2) : ""),
    [netPayable]
  );

  const cards = [
    {
      label: "Output VAT",
      hint: "Charged on sales and paid orders",
      value: summary.outputVat,
      icon: ArrowUpRight,
      color: "text-teal-700",
      bg: "bg-teal-50",
    },
    {
      label: "Input VAT",
      hint: "Paid on purchases",
      value: summary.inputVat,
      icon: ArrowDownLeft,
      color: "text-indigo-700",
      bg: "bg-indigo-50",
    },
    {
      label: "Payable",
      hint: "Output minus input",
      value: summary.payable,
      icon: Scale,
      color: "text-amber-700",
      bg: "bg-amber-50",
    },
    {
      label: "Paid",
      hint: "VAT remitted this period",
      value: summary.paid,
      icon: Landmark,
      color: "text-sky-700",
      bg: "bg-sky-50",
    },
  ];

  const submitPayment = (event) => {
    event.preventDefault();
    const amount = parseFloat(payment.amount || suggestedAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a VAT payment amount");
      return;
    }
    payMutation.mutate({
      amount,
      date: payment.date,
      paymentMethod: payment.paymentMethod,
      reference: payment.reference,
      notes: payment.notes,
    });
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">VAT</h1>
          <p className="text-sm text-gray-500">
            {setup.name || "VAT"} {setup.enabled ? `at ${setup.rate}%` : "is off"}
            {setup.tin ? ` · TIN ${setup.tin}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            className="form-input"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <input
            type="date"
            className="form-input"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
          <Link to="/settings" className="btn btn-outline">
            VAT setup
          </Link>
        </div>
      </div>

      {!setup.enabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Enable VAT in Settings so sales collect output VAT and purchases claim
          input VAT.{" "}
          <Link to="/settings" className="font-semibold underline">
            Open setup
          </Link>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center">
          <div className="spinner w-8 h-8 mx-auto"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <div key={card.label} className="card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{card.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {formatCurrency(card.value)}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{card.hint}</p>
                  </div>
                  <div className={`rounded-full p-2 ${card.bg}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="card p-6 lg:col-span-2">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-teal-50 p-2">
                  <Percent className="h-5 w-5 text-teal-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Net VAT</h2>
                  <p className="text-sm text-gray-500">
                    Payable minus VAT already paid
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Output VAT</span>
                  <span>{formatCurrency(summary.outputVat)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Less input VAT</span>
                  <span>- {formatCurrency(summary.inputVat)}</span>
                </div>
                <div className="flex justify-between border-t pt-3 font-medium">
                  <span>Payable</span>
                  <span>{formatCurrency(summary.payable)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Less paid</span>
                  <span>- {formatCurrency(summary.paid)}</span>
                </div>
                <div className="flex justify-between border-t pt-3 text-lg font-semibold">
                  <span>{netPayable < 0 ? "VAT credit" : "Net payable"}</span>
                  <span className={netPayable <= 0 ? "text-teal-700" : "text-amber-700"}>
                    {formatCurrency(netPayable)}
                  </span>
                </div>
              </div>
              {netPayable <= 0 && (
                <p className="mt-4 flex items-center gap-2 text-sm text-teal-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {netPayable < 0
                    ? "You have a VAT credit after payments."
                    : "This period is settled."}
                </p>
              )}
            </div>

            <form className="card p-6 space-y-4" onSubmit={submitPayment}>
              <h2 className="text-lg font-semibold text-gray-900">
                Record VAT payment
              </h2>
              <p className="text-sm text-gray-500">
                Paying FIRS (or your tax office) nets the payable balance.
              </p>
              <div>
                <label className="form-label">Amount</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="form-input"
                  value={payment.amount}
                  placeholder={suggestedAmount || "0.00"}
                  onChange={(event) =>
                    setPayment({ ...payment, amount: event.target.value })
                  }
                />
              </div>
              <div>
                <label className="form-label">Date paid</label>
                <input
                  type="date"
                  className="form-input"
                  value={payment.date}
                  onChange={(event) =>
                    setPayment({ ...payment, date: event.target.value })
                  }
                />
              </div>
              <div>
                <label className="form-label">Method</label>
                <select
                  className="form-select"
                  value={payment.paymentMethod}
                  onChange={(event) =>
                    setPayment({ ...payment, paymentMethod: event.target.value })
                  }
                >
                  <option value="bank">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="form-label">Reference</label>
                <input
                  className="form-input"
                  value={payment.reference}
                  placeholder="e.g. FIRS receipt"
                  onChange={(event) =>
                    setPayment({ ...payment, reference: event.target.value })
                  }
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={payMutation.isLoading}
              >
                {payMutation.isLoading ? "Saving..." : "Pay and net payable"}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <LedgerTable
              title="Output VAT"
              rows={summary.sales || []}
              numberKey="saleNumber"
              extraRows={summary.orders || []}
              extraNumberKey="orderNumber"
            />
            <LedgerTable
              title="Input VAT"
              rows={summary.purchases || []}
              numberKey="purchaseNumber"
            />
          </div>

          <div className="card overflow-hidden">
            <div className="border-b px-6 py-4">
              <h3 className="font-semibold text-gray-900">VAT payments</h3>
            </div>
            {(summary.payments || []).length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-500">
                No VAT payments in this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Reference</th>
                      <th className="px-6 py-3">Method</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.payments.map((row) => (
                      <tr key={row.id} className="border-t">
                        <td className="px-6 py-3">{row.date}</td>
                        <td className="px-6 py-3">{row.reference || "—"}</td>
                        <td className="px-6 py-3">{row.paymentMethod}</td>
                        <td className="px-6 py-3 text-right">
                          {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const LedgerTable = ({ title, rows, numberKey, extraRows = [], extraNumberKey }) => {
  const combined = [
    ...rows.map((row) => ({
      id: row.id,
      number: row[numberKey],
      date: row.date,
      taxAmount: row.taxAmount,
    })),
    ...extraRows.map((row) => ({
      id: row.id,
      number: row[extraNumberKey],
      date: row.createdAt?.slice?.(0, 10) || row.createdAt,
      taxAmount: row.taxAmount,
    })),
  ];

  return (
    <div className="card overflow-hidden">
      <div className="border-b px-6 py-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      {combined.length === 0 ? (
        <p className="px-6 py-8 text-sm text-gray-500">Nothing in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Number</th>
                <th className="px-6 py-3 text-right">VAT</th>
              </tr>
            </thead>
            <tbody>
              {combined.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-6 py-3">{row.date}</td>
                  <td className="px-6 py-3">{row.number}</td>
                  <td className="px-6 py-3 text-right">
                    {formatCurrency(row.taxAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VatPage;
