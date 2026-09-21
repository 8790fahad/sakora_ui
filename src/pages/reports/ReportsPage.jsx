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
} from "lucide-react";
import { useQuery } from "react-query";
import api from "../../services/api";

const ReportsPage = () => {
  const [activeReport, setActiveReport] = useState("sales");
  const [period, setPeriod] = useState("month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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
    "inventory-report",
    () => api.reports.inventory(),
    {
      enabled: activeReport === "inventory",
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
  ];

  // Render Sales Report
  const renderSalesReport = () => {
    const report = salesReportData?.data?.report;
    if (!report) return null;

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
              Payment Methods
            </h4>
            <p className="text-lg font-bold text-orange-600">
              {Object.keys(report.salesByPaymentMethod || {}).length} Types
            </p>
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Sales by Payment Method
          </h3>
          <div className="space-y-3">
            {Object.entries(report.salesByPaymentMethod || {}).map(
              ([method, data]) => (
                <div
                  key={method}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {method.replace("_", " ")}
                    </p>
                    <p className="text-sm text-gray-500">
                      {data.count} transactions
                    </p>
                  </div>
                  <p className="font-bold text-green-600">
                    {formatCurrency(data.amount)}
                  </p>
                </div>
              )
            )}
          </div>
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
  const renderInventoryReport = () => {
    const report = inventoryReportData?.data?.report;
    if (!report) return null;

    return (
      <div className="space-y-6">
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
      </div>
    </div>
  );
};

export default ReportsPage;
