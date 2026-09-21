import React, { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  Search,
  Filter,
  Calendar,
  Eye,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  CreditCard,
  Banknote,
  Building,
  X,
  Save,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import api from "../../services/api";

const CashPage = () => {
  const [view, setView] = useState("overview"); // 'overview' or 'transactions' or 'manual'
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [showManualModal, setShowManualModal] = useState(false);
  const [showOpeningModal, setShowOpeningModal] = useState(false);

  // Manual transaction form
  const [manualForm, setManualForm] = useState({
    type: "in",
    amount: "",
    description: "",
    paymentMethod: "cash",
    notes: "",
  });

  // Opening balance form
  const [openingForm, setOpeningForm] = useState({
    amount: "",
    description: "Opening cash balance",
  });

  const queryClient = useQueryClient();

  // Fetch current cash balance
  const {
    data: balanceData,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useQuery("cash-balance", api.cash.balance, {
    refetchOnWindowFocus: false,
  });

  // Fetch cash transactions
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery(
    ["cash-transactions", { search, typeFilter, paymentFilter, dateFilter }],
    () =>
      api.cash.transactions({
        search,
        type: typeFilter === "all" ? undefined : typeFilter,
        paymentMethod: paymentFilter === "all" ? undefined : paymentFilter,
        dateFrom: dateFilter || undefined,
        page: 1,
        limit: 50,
      }),
    {
      refetchOnWindowFocus: false,
    }
  );

  // Fetch cash summary
  const { data: summaryData, isLoading: summaryLoading } = useQuery(
    "cash-summary",
    () => api.cash.summary(),
    {
      refetchOnWindowFocus: false,
    }
  );

  // Record manual transaction mutation
  const recordManualMutation = useMutation(api.cash.recordManual, {
    onSuccess: () => {
      toast.success("Transaction recorded successfully!");
      setShowManualModal(false);
      resetManualForm();
      queryClient.invalidateQueries("cash-balance");
      queryClient.invalidateQueries("cash-transactions");
      queryClient.invalidateQueries("cash-summary");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to record transaction");
    },
  });

  // Set opening balance mutation
  const openingBalanceMutation = useMutation(api.cash.setOpeningBalance, {
    onSuccess: () => {
      toast.success("Opening balance set successfully!");
      setShowOpeningModal(false);
      resetOpeningForm();
      queryClient.invalidateQueries("cash-balance");
      queryClient.invalidateQueries("cash-transactions");
      queryClient.invalidateQueries("cash-summary");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to set opening balance");
    },
  });

  const currentBalance = balanceData?.data?.balance || 0;
  const transactions = transactionsData?.data?.items || [];
  const summary = summaryData?.data?.summary || {};

  const resetManualForm = () => {
    setManualForm({
      type: "in",
      amount: "",
      description: "",
      paymentMethod: "cash",
      notes: "",
    });
  };

  const resetOpeningForm = () => {
    setOpeningForm({
      amount: "",
      description: "Opening cash balance",
    });
  };

  const submitManualTransaction = () => {
    if (!manualForm.description.trim()) {
      toast.error("Enter transaction description");
      return;
    }
    if (!manualForm.amount || parseFloat(manualForm.amount) <= 0) {
      toast.error("Enter valid amount");
      return;
    }

    recordManualMutation.mutate(manualForm);
  };

  const submitOpeningBalance = () => {
    if (!openingForm.amount || parseFloat(openingForm.amount) < 0) {
      toast.error("Enter valid opening balance");
      return;
    }

    openingBalanceMutation.mutate(openingForm);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case "cash":
        return <Banknote className="w-4 h-4" />;
      case "bank_transfer":
        return <Building className="w-4 h-4" />;
      case "card":
        return <CreditCard className="w-4 h-4" />;
      case "cheque":
        return <CreditCard className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const getReferenceTypeLabel = (type) => {
    switch (type) {
      case "sale":
        return "Sale";
      case "purchase":
        return "Purchase";
      case "expense":
        return "Expense";
      case "manual":
        return "Manual";
      case "opening_balance":
        return "Opening Balance";
      default:
        return type;
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Cash Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track cash flow and monitor business finances
          </p>
        </div>

        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setView("overview")}
              className={`px-4 py-2 rounded-l-lg text-sm font-medium transition-colors ${
                view === "overview"
                  ? "bg-primary-100 text-primary-600 border-primary-300"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Wallet className="w-4 h-4 mr-2 inline" />
              Overview
            </button>
            <button
              onClick={() => setView("transactions")}
              className={`px-4 py-2 rounded-r-lg text-sm font-medium transition-colors ${
                view === "transactions"
                  ? "bg-primary-100 text-primary-600 border-primary-300"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <DollarSign className="w-4 h-4 mr-2 inline" />
              Transactions
            </button>
          </div>

          <button
            onClick={() => setShowManualModal(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Transaction
          </button>
        </div>
      </div>

      {/* Overview */}
      {view === "overview" && (
        <div className="space-y-6">
          {/* Current Balance Card */}
          <div className="card p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <Wallet className="w-8 h-8 text-primary-600" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Current Cash Balance
            </h3>
            {balanceLoading ? (
              <div className="animate-pulse">
                <div className="h-10 bg-gray-200 rounded w-48 mx-auto"></div>
              </div>
            ) : (
              <p
                className={`text-4xl font-bold ${
                  currentBalance >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(currentBalance)}
              </p>
            )}
            <div className="flex justify-center space-x-4 mt-4">
              <button
                onClick={() => setShowOpeningModal(true)}
                className="btn btn-outline btn-sm"
              >
                Set Opening Balance
              </button>
              <button
                onClick={() => setShowManualModal(true)}
                className="btn btn-primary btn-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Transaction
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          {summaryLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-8 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <ArrowUpCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Cash In
                </h4>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.totalCashIn || 0)}
                </p>
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <ArrowDownCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Cash Out
                </h4>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.totalCashOut || 0)}
                </p>
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Net Flow
                </h4>
                <p
                  className={`text-2xl font-bold ${
                    (summary.netFlow || 0) >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(summary.netFlow || 0)}
                </p>
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Transactions
                </h4>
                <p className="text-2xl font-bold text-purple-600">
                  {summary.transactionCount || 0}
                </p>
              </div>
            </div>
          )}

          {/* Recent Transactions Preview */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Transactions
              </h3>
              <button
                onClick={() => setView("transactions")}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                View All
              </button>
            </div>

            {transactionsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse flex justify-between items-center p-3 bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="h-5 bg-gray-200 rounded w-20"></div>
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No transactions recorded yet</p>
                <button
                  onClick={() => setShowManualModal(true)}
                  className="btn btn-primary btn-sm mt-3"
                >
                  Record First Transaction
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.slice(0, 5).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          transaction.type === "in"
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {transaction.type === "in" ? (
                          <ArrowUpCircle className="w-4 h-4" />
                        ) : (
                          <ArrowDownCircle className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {transaction.description}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 space-x-2">
                          <span>
                            {new Date(
                              transaction.createdAt
                            ).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span>
                            {getReferenceTypeLabel(transaction.referenceType)}
                          </span>
                          <span>•</span>
                          <div className="flex items-center">
                            {getPaymentMethodIcon(transaction.paymentMethod)}
                            <span className="ml-1 capitalize">
                              {transaction.paymentMethod.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          transaction.type === "in"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {transaction.type === "in" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Balance: {formatCurrency(transaction.runningBalance)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transactions List */}
      {view === "transactions" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="card p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  className="form-select"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="in">Cash In</option>
                  <option value="out">Cash Out</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method
                </label>
                <select
                  className="form-select"
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                >
                  <option value="all">All Methods</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setTypeFilter("all");
                    setPaymentFilter("all");
                    setDateFilter("");
                  }}
                  className="btn btn-outline w-full"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {transactionsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-gray-200 rounded w-48"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div>
                        </td>
                      </tr>
                    ))
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">No transactions found</p>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <div>
                            {new Date(
                              transaction.createdAt
                            ).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(
                              transaction.createdAt
                            ).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          <div className="font-medium">
                            {transaction.description}
                          </div>
                          {transaction.notes && (
                            <div className="text-xs text-gray-500 mt-1">
                              {transaction.notes}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium">
                            {getReferenceTypeLabel(transaction.referenceType)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <div className="flex items-center">
                            {getPaymentMethodIcon(transaction.paymentMethod)}
                            <span className="ml-2 capitalize">
                              {transaction.paymentMethod.replace("_", " ")}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                          <span
                            className={
                              transaction.type === "in"
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {transaction.type === "in" ? "+" : "-"}
                            {formatCurrency(transaction.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                          {formatCurrency(transaction.runningBalance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manual Transaction Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Record Cash Transaction
              </h3>
              <button
                onClick={() => {
                  setShowManualModal(false);
                  resetManualForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Transaction Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setManualForm({ ...manualForm, type: "in" })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      manualForm.type === "in"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 hover:border-green-300"
                    }`}
                  >
                    <ArrowUpCircle className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">Cash In</span>
                  </button>
                  <button
                    onClick={() =>
                      setManualForm({ ...manualForm, type: "out" })
                    }
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      manualForm.type === "out"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-gray-200 hover:border-red-300"
                    }`}
                  >
                    <ArrowDownCircle className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">Cash Out</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    ₦
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input pl-8"
                    placeholder="0.00"
                    value={manualForm.amount}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, amount: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="What is this transaction for?"
                  value={manualForm.description}
                  onChange={(e) =>
                    setManualForm({
                      ...manualForm,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method *
                </label>
                <select
                  className="form-select"
                  value={manualForm.paymentMethod}
                  onChange={(e) =>
                    setManualForm({
                      ...manualForm,
                      paymentMethod: e.target.value,
                    })
                  }
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Additional notes..."
                  value={manualForm.notes}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, notes: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex space-x-3 p-4">
              <button
                onClick={submitManualTransaction}
                disabled={recordManualMutation.isLoading}
                className="flex-1 btn btn-primary"
              >
                {recordManualMutation.isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Recording...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Record Transaction
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowManualModal(false);
                  resetManualForm();
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opening Balance Modal */}
      {showOpeningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Set Opening Balance
              </h3>
              <button
                onClick={() => {
                  setShowOpeningModal(false);
                  resetOpeningForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-blue-500 mr-3" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Opening balance can only be set once. Use manual
                    transactions for adjustments.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Opening Balance *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    ₦
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input pl-8"
                    placeholder="0.00"
                    value={openingForm.amount}
                    onChange={(e) =>
                      setOpeningForm({ ...openingForm, amount: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={openingForm.description}
                  onChange={(e) =>
                    setOpeningForm({
                      ...openingForm,
                      description: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex space-x-3 p-4">
              <button
                onClick={submitOpeningBalance}
                disabled={openingBalanceMutation.isLoading}
                className="flex-1 btn btn-primary"
              >
                {openingBalanceMutation.isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Setting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Set Opening Balance
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowOpeningModal(false);
                  resetOpeningForm();
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashPage;

