import React, { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  ShoppingBag,
  Receipt,
  Package,
  Calendar,
  Download,
  Filter,
  Eye,
  ArrowUp,
  ArrowDown,
  Percent,
  Users,
  Tag,
  Banknote,
  Landmark,
} from "lucide-react";
import { useQuery } from "react-query";
import { Link } from "react-router-dom";
import api from "../../services/api";

const isoDate = (date) => date.toISOString().split("T")[0];

const vatRangeForPeriod = (period, dateFrom, dateTo) => {
  const now = new Date();
  const to = isoDate(now);
  if (period === "custom") {
    return { from: dateFrom || isoDate(now), to: dateTo || to };
  }
  const start = new Date(now);
  if (period === "day") start.setHours(0, 0, 0, 0);
  if (period === "week") start.setDate(now.getDate() - now.getDay());
  if (period === "month") start.setDate(1);
  if (period === "quarter") start.setMonth(Math.floor(now.getMonth() / 3) * 3, 1);
  if (period === "year") start.setMonth(0, 1);
  return { from: isoDate(start), to };
};

const ReportsPage = () => {
  const [activeReport, setActiveReport] = useState("sales");
  const [period, setPeriod] = useState("day");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedStockId, setSelectedStockId] = useState(null);
  const [paymentFilter, setPaymentFilter] = useState("all");

  // Common query parameters
  const getQueryParams = () => ({
    period: period === "custom" ? "custom" : period,
    dateFrom: period === "custom" ? dateFrom : undefined,
    dateTo: period === "custom" ? dateTo : undefined,
  });

  // Sales Report
  const { data: salesReportData, isLoading: salesLoading } = useQuery(
    ["sales-report", getQueryParams()],
    () => api.reports.sales(getQueryParams()),
    {
      enabled: activeReport === "sales",
      refetchOnWindowFocus: false,
    }
  );

  // Purchase Report
  const { data: purchaseReportData, isLoading: purchaseLoading } = useQuery(
    ["purchase-report", getQueryParams()],
    () => api.reports.purchases(getQueryParams()),
    {
      enabled: activeReport === "purchases",
      refetchOnWindowFocus: false,
    }
  );

  // Expense Report
  const { data: expenseReportData, isLoading: expenseLoading } = useQuery(
    ["expense-report", getQueryParams()],
    () => api.reports.expenses(getQueryParams()),
    {
      enabled: activeReport === "expenses",
      refetchOnWindowFocus: false,
    }
  );

  // P&L Report
  const { data: profitLossData, isLoading: profitLossLoading } = useQuery(
    ["profit-loss-report", getQueryParams()],
    () => api.reports["profit-loss"](getQueryParams()),
    {
      enabled: activeReport === "profit-loss",
      refetchOnWindowFocus: false,
    }
  );

  // Inventory Report
  const { data: inventoryReportData, isLoading: inventoryLoading } = useQuery(
    ["inventory-report", getQueryParams()],
    () => api.reports.inventory(getQueryParams()),
    {
      enabled: activeReport === "inventory",
      refetchOnWindowFocus: false,
    }
  );

  const { data: settingsData } = useQuery("settings", api.settings.get, {
    staleTime: 60 * 1000,
  });
  const bankAccounts =
    settingsData?.data?.bankAccounts ||
    settingsData?.data?.business?.bankAccounts ||
    [];

  const vatParams = vatRangeForPeriod(period, dateFrom, dateTo);
  const { data: vatReportData, isLoading: vatLoading } = useQuery(
    ["vat-report", vatParams],
    () => api.vat.summary(vatParams),
    {
      enabled: activeReport === "vat",
      refetchOnWindowFocus: false,
    }
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getPeriodLabel = () => {
    switch (period) {
      case "day":
        return "Today";
      case "week":
        return "This Week";
      case "month":
        return "This Month";
      case "quarter":
        return "This Quarter";
      case "year":
        return "This Year";
      case "custom":
        return `${dateFrom ? formatDate(dateFrom) : ""} - ${
          dateTo ? formatDate(dateTo) : ""
        }`;
      default:
        return "This Month";
    }
  };

  const reportTabs = [
    {
      key: "sales",
      name: "Sales",
      icon: ShoppingCart,
      color: "text-green-600",
    },
    {
      key: "purchases",
      name: "Purchases",
      icon: ShoppingBag,
      color: "text-blue-600",
    },
    {
      key: "expenses",
      name: "Expenses",
      icon: Receipt,
      color: "text-red-600",
    },
    {
      key: "profit-loss",
      name: "P&L",
      icon: TrendingUp,
      color: "text-purple-600",
    },
    {
      key: "inventory",
      name: "Inventory",
      icon: Package,
      color: "text-orange-600",
    },
    {
      key: "vat",
      name: "VAT",
      icon: Percent,
      color: "text-teal-600",
    },
  ];

  // Render Sales Report
  const paymentBuckets = (rows = {}) => {
    const take = (keys) =>
      keys.reduce(
        (sum, key) => {
          const row = rows[key];
          if (!row) return sum;
          return {
            count: sum.count + (Number(row.count) || 0),
            amount: sum.amount + (Number(row.amount) || 0),
          };
        },
        { count: 0, amount: 0 }
      );
    const cash = take(["cash"]);
    const bank = take(["bank", "bank_transfer"]);
    const listed = [
      { key: "cash", label: "Cash", icon: Banknote, ...cash },
      { key: "bank", label: "Bank", icon: Landmark, ...bank },
    ];
    const used = new Set(["cash", "bank", "bank_transfer"]);
    Object.entries(rows).forEach(([method, data]) => {
      if (used.has(method)) return;
      listed.push({
        key: method,
        label: String(method).replace(/_/g, " "),
        icon: DollarSign,
        count: Number(data.count) || 0,
        amount: Number(data.amount) || 0,
      });
    });
    return listed;
  };

  const renderSalesReport = () => {
    const report = salesReportData?.data?.report;
    if (!report) return null;
    const payments = paymentBuckets(report.salesByPaymentMethod);
    const paymentSales = report.payments || [];
    const saleIsBank = (sale) =>
      sale.paymentMethod === "bank" || sale.paymentMethod === "bank_transfer";
    const saleMatchesBank = (sale, bank) => {
      if (!saleIsBank(sale) || !bank) return false;
      if (sale.bankAccountId && sale.bankAccountId === bank.id) return true;
      const notes = String(sale.notes || "");
      return Boolean(bank.accountNumber) && notes.includes(bank.accountNumber);
    };
    const moneyOf = (sale) => Number(sale.paidAmount) || Number(sale.total) || 0;
    const bankNameOf = (sale) => {
      const saved = bankAccounts.find((bank) => bank.id === sale.bankAccountId);
      if (saved?.bankName) return saved.bankName;
      const line = String(sale.notes || "")
        .split("\n")
        .find((part) => part.trim().toLowerCase().startsWith("bank:"));
      if (!line) return "Bank";
      const named = line.replace(/^bank:\s*/i, "").split("·")[0].trim();
      return named || "Bank";
    };
    const cashPayment = payments.find((row) => row.key === "cash") || {
      count: 0,
      amount: 0,
    };
    const accountRows = bankAccounts.map((bank) => {
      const matched = paymentSales.filter((sale) => saleMatchesBank(sale, bank));
      return {
        key: bank.id,
        label: bank.bankName,
        detail: `${bank.accountNumber} · ${matched.length} transaction${
          matched.length === 1 ? "" : "s"
        }`,
        amount: matched.reduce((sum, sale) => sum + moneyOf(sale), 0),
        icon: Landmark,
      };
    });
    const paymentRows = [
      {
        key: "cash",
        label: "Cash",
        detail: `${cashPayment.count} transaction${cashPayment.count === 1 ? "" : "s"}`,
        amount: cashPayment.amount,
        icon: Banknote,
      },
      ...(accountRows.length
        ? accountRows
        : [
            {
              key: "bank",
              label: "Bank",
              detail: `${payments[1]?.count || 0} transactions`,
              amount: payments[1]?.amount || 0,
              icon: Landmark,
            },
          ]),
    ];

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Revenue
            </h4>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(report.totalRevenue)}
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Sales
            </h4>
            <p className="text-2xl font-bold text-blue-600">
              {report.totalSales}
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Avg Sale Value
            </h4>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(report.averageSaleValue)}
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Cash & Bank
            </h4>
            <p className="text-lg font-bold text-green-600">
              Cash {formatCurrency(cashPayment.amount)}
            </p>
            {(accountRows.length ? accountRows : [{ key: "bank", label: "Bank", amount: payments[1]?.amount || 0 }]).map(
              (row) => (
                <p key={row.key} className="text-lg font-bold text-blue-600">
                  {row.label} {formatCurrency(row.amount)}
                </p>
              )
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Selling Products
          </h3>
          {report.topProducts?.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No products sold in this period
            </p>
          ) : (
            <div className="space-y-3">
              {report.topProducts?.slice(0, 5).map((product, index) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-primary-600">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {product.productName}
                      </p>
                      <p className="text-sm text-gray-500">
                        SKU: {product.sku} • {product.totalQuantity} sold
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      {formatCurrency(product.totalRevenue)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {product.salesCount} transactions
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Cash and Bank
            </h3>
            <select
              className="form-select sm:w-72"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="all">All cash and bank</option>
              <option value="cash">Cash</option>
              <option value="bank">All banks</option>
              {bankAccounts.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.bankName} · {bank.accountNumber}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-3 mb-6">
            {paymentRows.map((row) => {
              const Icon = row.icon;
              const active = paymentFilter === row.key;
              return (
                <button
                  key={row.key}
                  type="button"
                  onClick={() => setPaymentFilter(row.key)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left ${
                    active
                      ? "bg-primary-50 ring-1 ring-primary-200"
                      : "bg-gray-50 dark:bg-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-200">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {row.label}
                      </p>
                      <p className="text-sm text-gray-500">{row.detail}</p>
                    </div>
                  </div>
                  <p className="font-bold text-green-600">
                    {formatCurrency(row.amount)}
                  </p>
                </button>
              );
            })}
          </div>

          {(() => {
            const rows = (report.payments || []).filter((sale) => {
              const method = sale.paymentMethod;
              const isCash = method === "cash";
              const isBank = method === "bank" || method === "bank_transfer";
              if (paymentFilter === "cash") return isCash;
              if (paymentFilter === "bank") return isBank;
              if (paymentFilter === "all") return isCash || isBank;
              const bank = bankAccounts.find((item) => item.id === paymentFilter);
              if (!bank || !isBank) return false;
              if (sale.bankAccountId === bank.id) return true;
              const notes = String(sale.notes || "");
              return (
                notes.includes(bank.accountNumber) ||
                notes.includes(bank.bankName)
              );
            });
            const filteredTotal = rows.reduce(
              (sum, sale) => sum + (Number(sale.paidAmount) || Number(sale.total) || 0),
              0
            );
            const bankName = bankNameOf;
            return (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-500">
                    {rows.length} sale{rows.length === 1 ? "" : "s"}
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(filteredTotal)}
                  </p>
                </div>
                {rows.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No sales for this filter in the selected period
                  </p>
                ) : (
                  <div className="space-y-2">
                    {rows.map((sale) => (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {sale.saleNumber}
                            <span className="text-gray-500 font-normal">
                              {" "}
                              · {sale.customerName}
                            </span>
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(sale.date)} ·{" "}
                            {sale.paymentMethod === "cash" ? "Cash" : bankName(sale)}
                          </p>
                        </div>
                        <p className="font-bold text-green-600 shrink-0">
                          {formatCurrency(sale.paidAmount || sale.total)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  // Render Purchase Report
  const renderPurchaseReport = () => {
    const report = purchaseReportData?.data?.report;
    if (!report) return null;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Spend
            </h4>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(report.totalSpend)}
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Purchases
            </h4>
            <p className="text-2xl font-bold text-purple-600">
              {report.totalPurchases}
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Avg Purchase
            </h4>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(report.averagePurchaseValue)}
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Outstanding
            </h4>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(report.outstandingPayments)}
            </p>
          </div>
        </div>

        {/* Top Products */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Purchased Products
          </h3>
          <div className="space-y-3">
            {report.topPurchasedProducts?.slice(0, 5).map((product, index) => (
              <div
                key={product.productId}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-600">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {product.productName}
                    </p>
                    <p className="text-sm text-gray-500">
                      SKU: {product.sku} • {product.totalQuantity} units
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">
                    {formatCurrency(product.totalCost)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Avg: {formatCurrency(product.avgUnitCost)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Suppliers */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Suppliers
          </h3>
          <div className="space-y-3">
            {report.purchasesBySupplier?.slice(0, 5).map((supplier, index) => (
              <div
                key={supplier.supplierId}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-orange-600">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {supplier.supplierName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {supplier.count} purchases
                    </p>
                  </div>
                </div>
                <p className="font-bold text-blue-600">
                  {formatCurrency(supplier.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render Expense Report
  const renderExpenseReport = () => {
    const report = expenseReportData?.data?.report;
    if (!report) return null;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Expenses
            </h4>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(report.totalAmount)}
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Transactions
            </h4>
            <p className="text-2xl font-bold text-purple-600">
              {report.totalExpenses}
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Average Expense
            </h4>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(report.averageExpense)}
            </p>
          </div>
        </div>

        {/* Expenses by Category */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Expenses by Category
          </h3>
          <div className="space-y-3">
            {report.expensesByCategory?.map((category) => (
              <div
                key={category.categoryId}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.categoryColor }}
                  ></div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {category.categoryName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {category.count} transactions • Avg:{" "}
                      {formatCurrency(category.avgAmount)}
                    </p>
                  </div>
                </div>
                <p className="font-bold text-red-600">
                  {formatCurrency(category.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Expenses */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Largest Expenses
          </h3>
          <div className="space-y-3">
            {report.topExpenses?.slice(0, 5).map((expense, index) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-red-600">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {expense.description}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(expense.date)} • {expense.categoryName}
                    </p>
                  </div>
                </div>
                <p className="font-bold text-red-600">
                  {formatCurrency(expense.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render Profit & Loss Report
  const renderProfitLossReport = () => {
    const report = profitLossData?.data?.report;
    if (!report) return null;

    return (
      <div className="space-y-6">
        {/* P&L Summary */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Profit & Loss Statement
          </h3>

          <div className="space-y-4">
            {/* Revenue */}
            <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-600">
              <span className="font-medium text-gray-900 dark:text-white">
                Revenue
              </span>
              <span className="font-bold text-green-600">
                {formatCurrency(report.revenue)}
              </span>
            </div>

            {/* Cost of Goods Sold */}
            <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-600">
              <span className="font-medium text-gray-900 dark:text-white">
                Cost of Goods Sold
              </span>
              <span className="font-bold text-red-600">
                -{formatCurrency(report.costOfGoodsSold)}
              </span>
            </div>

            {/* Gross Profit */}
            <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 rounded">
              <span className="font-semibold text-gray-900 dark:text-white">
                Gross Profit
              </span>
              <div className="text-right">
                <span
                  className={`font-bold ${
                    report.grossProfit >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(report.grossProfit)}
                </span>
                <div className="text-xs text-gray-500">
                  {report.grossProfitMargin.toFixed(1)}% margin
                </div>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-600">
              <span className="font-medium text-gray-900 dark:text-white">
                Operating Expenses
              </span>
              <span className="font-bold text-red-600">
                -{formatCurrency(report.operatingExpenses)}
              </span>
            </div>

            {/* Net Profit */}
            <div className="flex justify-between items-center py-4 bg-gray-100 dark:bg-gray-700 px-4 rounded-lg">
              <span className="font-bold text-lg text-gray-900 dark:text-white">
                Net Profit
              </span>
              <div className="text-right">
                <span
                  className={`font-bold text-xl ${
                    report.netProfit >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(report.netProfit)}
                </span>
                <div className="text-sm text-gray-500">
                  {report.netProfitMargin.toFixed(1)}% margin
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-green-600 font-bold">100%</span>
            </div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Revenue
            </h4>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(report.revenue)}
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <span className="text-red-600 font-bold">
                {report.breakdown.cogsPercentage.toFixed(1)}%
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              COGS
            </h4>
            <p className="text-xl font-bold text-red-600">
              {formatCurrency(report.costOfGoodsSold)}
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-orange-600 font-bold">
                {report.breakdown.expensesPercentage.toFixed(1)}%
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Expenses
            </h4>
            <p className="text-xl font-bold text-orange-600">
              {formatCurrency(report.operatingExpenses)}
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-12 h-12 ${
                  report.netProfit >= 0 ? "bg-green-100" : "bg-red-100"
                } rounded-lg flex items-center justify-center`}
              >
                {report.netProfit >= 0 ? (
                  <ArrowUp className="w-6 h-6 text-green-600" />
                ) : (
                  <ArrowDown className="w-6 h-6 text-red-600" />
                )}
              </div>
              <span
                className={`font-bold ${
                  report.netProfit >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {report.breakdown.profitPercentage.toFixed(1)}%
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Net Profit
            </h4>
            <p
              className={`text-xl font-bold ${
                report.netProfit >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(report.netProfit)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Render Inventory Report
  const formatQty = (amount) =>
    Number(amount || 0).toLocaleString("en-NG", { maximumFractionDigits: 3 });

  const renderInventoryReport = () => {
    const report = inventoryReportData?.data?.report;
    if (!report) return null;
    const selectedProduct = (report.movementProducts || []).find(
      (row) => (row.productId || row.name) === selectedStockId
    );

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Stock in</h4>
            <p className="text-2xl font-bold text-green-600">{formatQty(report.stockIn)}</p>
            <p className="mt-1 text-xs text-gray-500">Purchases in {getPeriodLabel().toLowerCase()}</p>
          </div>
          <div className="card p-6">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Stock out</h4>
            <p className="text-2xl font-bold text-red-600">{formatQty(report.stockOut)}</p>
            <p className="mt-1 text-xs text-gray-500">Sales and quotations in {getPeriodLabel().toLowerCase()}</p>
          </div>
          <div className="card p-6">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">On hand</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatQty(report.onHand)}</p>
            <p className="mt-1 text-xs text-gray-500">Current stock</p>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Summary
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Click a product to see stock in, stock out, and the running balance.
          </p>
          {(report.movementProducts || []).length === 0 ? (
            <p className="text-sm text-gray-500">No stock on hand yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-4 font-medium">Product</th>
                    <th className="py-2 pr-4 font-medium">In</th>
                    <th className="py-2 pr-4 font-medium">Out</th>
                    <th className="py-2 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {report.movementProducts.map((row) => {
                    const selected = selectedStockId === (row.productId || row.name);
                    return (
                      <tr
                        key={row.productId || row.name}
                        className={`border-b border-gray-100 cursor-pointer ${
                          selected ? "bg-teal-50" : "hover:bg-gray-50"
                        }`}
                        onClick={() =>
                          setSelectedStockId(selected ? null : row.productId || row.name)
                        }
                      >
                        <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{row.name}</td>
                        <td className="py-2 pr-4 text-green-700">{formatQty(row.stockIn)}</td>
                        <td className="py-2 pr-4 text-red-700">{formatQty(row.stockOut)}</td>
                        <td className="py-2 font-semibold">
                          {formatQty(row.balance ?? row.onHand)} {row.unit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {selectedProduct && (
            <div className="mt-6">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {selectedProduct.name} history
                </h4>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Current balance {formatQty(selectedProduct.balance ?? selectedProduct.onHand)}{" "}
                  {selectedProduct.unit}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-4 font-medium">Date</th>
                      <th className="py-2 pr-4 font-medium">Details</th>
                      <th className="py-2 pr-4 font-medium">In</th>
                      <th className="py-2 pr-4 font-medium">Out</th>
                      <th className="py-2 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 pr-4 text-gray-500">Opening</td>
                      <td className="py-2 pr-4">Balance before these movements</td>
                      <td className="py-2 pr-4"></td>
                      <td className="py-2 pr-4"></td>
                      <td className="py-2 font-semibold">
                        {formatQty(selectedProduct.opening ?? 0)} {selectedProduct.unit}
                      </td>
                    </tr>
                    {(selectedProduct.history || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-3 text-gray-500">
                          No stock in or out in this period.
                        </td>
                      </tr>
                    ) : (
                      selectedProduct.history.map((row) => (
                        <tr key={`${row.kind}-${row.id}`} className="border-b border-gray-100">
                          <td className="py-2 pr-4">{formatDate(row.date || row.at)}</td>
                          <td className="py-2 pr-4">
                            {row.kind} {row.reference}
                          </td>
                          <td className="py-2 pr-4 text-green-700">
                            {row.direction === "in" ? formatQty(row.quantity) : ""}
                          </td>
                          <td className="py-2 pr-4 text-red-700">
                            {row.direction === "out" ? formatQty(row.quantity) : ""}
                          </td>
                          <td className="py-2 font-semibold">
                            {formatQty(row.balance)} {row.unit}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Items
            </h4>
            <p className="text-2xl font-bold text-blue-600">
              {report.totalItems}
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Stock Value
            </h4>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(report.totalStockValue)}
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Low Stock Items
            </h4>
            <p className="text-2xl font-bold text-red-600">
              {report.lowStockItems}
            </p>
          </div>
        </div>

        {/* Low Stock Alert */}
        {report.lowStockProducts?.length > 0 && (
          <div className="card p-6 border-l-4 border-red-500">
            <h3 className="text-lg font-semibold text-red-600 mb-4">
              Low Stock Alert
            </h3>
            <div className="space-y-2">
              {report.lowStockProducts.slice(0, 5).map((product) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {product.name}
                    </p>
                    <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">
                      {product.currentStock}
                    </p>
                    <p className="text-xs text-gray-500">
                      Min: {product.reorderPoint}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Stock Value by Category
          </h3>
          <div className="space-y-3">
            {report.categoryBreakdown?.map((category) => (
              <div
                key={category.categoryId}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.categoryColor }}
                  ></div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {category.categoryName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {category.totalQuantity} items
                    </p>
                  </div>
                </div>
                <p className="font-bold text-green-600">
                  {formatCurrency(category.totalValue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderVatReport = () => {
    const summary = vatReportData?.data;
    if (!summary) return null;
    const cards = [
      { label: "Output VAT", value: summary.outputVat, hint: "Sales and paid orders" },
      { label: "Input VAT", value: summary.inputVat, hint: "Purchases" },
      { label: "Payable", value: summary.payable, hint: "Output minus input" },
      { label: "Paid", value: summary.paid, hint: "VAT remitted" },
      { label: "Net payable", value: summary.netPayable, hint: "Payable minus paid" },
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {cards.map((card) => (
            <div key={card.label} className="card p-5">
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(card.value)}
              </p>
              <p className="mt-1 text-xs text-gray-400">{card.hint}</p>
            </div>
          ))}
        </div>
        <div className="card p-6">
          <p className="text-sm text-gray-600">
            {summary.setup?.enabled
              ? `${summary.setup.name || "VAT"} is on at ${summary.setup.rate}%.`
              : "VAT is off in Settings. Enable it so new sales and purchases post tax."}
          </p>
          <Link to="/vat" className="btn btn-primary mt-4 inline-flex">
            Open VAT ledger
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Reports & Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Business insights and performance reports • {getPeriodLabel()}
          </p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Report Period
            </label>
            <select
              className="form-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {period === "custom" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex space-x-1 mb-6 overflow-x-auto">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveReport(tab.key)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeReport === tab.key
                  ? "bg-primary-100 text-primary-700 border border-primary-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Icon className={`w-4 h-4 ${tab.color}`} />
              <span className="font-medium">{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Report Content */}
      <div className="min-h-96">
        {activeReport === "sales" && (
          <>
            {salesLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Generating sales report...</p>
              </div>
            ) : (
              renderSalesReport()
            )}
          </>
        )}

        {activeReport === "purchases" && (
          <>
            {purchaseLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">
                  Generating purchase report...
                </p>
              </div>
            ) : (
              renderPurchaseReport()
            )}
          </>
        )}

        {activeReport === "expenses" && (
          <>
            {expenseLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">
                  Generating expense report...
                </p>
              </div>
            ) : (
              renderExpenseReport()
            )}
          </>
        )}

        {activeReport === "profit-loss" && (
          <>
            {profitLossLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Generating P&L report...</p>
              </div>
            ) : (
              renderProfitLossReport()
            )}
          </>
        )}

        {activeReport === "inventory" && (
          <>
            {inventoryLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">
                  Generating inventory report...
                </p>
              </div>
            ) : (
              renderInventoryReport()
            )}
          </>
        )}

        {activeReport === "vat" && (
          <>
            {vatLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Generating VAT report...</p>
              </div>
            ) : (
              renderVatReport()
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
