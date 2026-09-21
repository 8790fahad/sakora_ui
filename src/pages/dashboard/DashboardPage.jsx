import React from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Receipt,
  Users,
  AlertTriangle,
  Wallet,
  Truck,
  Clock,
  ChevronRight,
  BarChart3,
  Loader2,
  RefreshCw,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useQuery } from "react-query";
import { selectUser } from "../../store/slices/authSlice";
import api from "../../services/api";

const DashboardPage = () => {
  const user = useSelector(selectUser);

  // Fetch dashboard stats
  const {
    data: statsData,
    isLoading: statsLoading,
    refetch: refetchStats,
    isFetching,
  } = useQuery("dashboard-stats", api.dashboard.stats, {
    refetchOnWindowFocus: false,
    refetchInterval: 300000,
  });

  // Fetch recent activities
  const { data: activitiesData, isLoading: activitiesLoading } = useQuery(
    "dashboard-recent",
    api.dashboard.recent,
    { refetchOnWindowFocus: false }
  );

  const stats = statsData?.data || {};
  const activities = activitiesData?.data?.activities || [];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getTimeOfDayGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "sale":
        return ShoppingCart;
      case "purchase":
        return Truck;
      case "expense":
        return Receipt;
      default:
        return Package;
    }
  };

  const quickActions = [
    { name: "New Sale", href: "/sales", icon: ShoppingCart, color: "#34C759" },
    { name: "Products", href: "/products", icon: Package, color: "#007AFF" },
    { name: "Expense", href: "/expenses", icon: Receipt, color: "#FF9500" },
    { name: "Reports", href: "/reports", icon: BarChart3, color: "#AF52DE" },
  ];

  return (
    <div className="pb-4 md:pb-8">
      {/* Greeting Section - Hidden on desktop since title is in header */}
      <div className="px-4 pt-2 pb-4 md:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-[var(--ios-text-primary)]">
              {getTimeOfDayGreeting()}
            </h1>
            <p className="text-[15px] text-[var(--ios-gray-1)]">
              {user?.firstName} • {user?.business?.name}
            </p>
          </div>
          <button
            onClick={() => refetchStats()}
            disabled={isFetching}
            className="w-10 h-10 rounded-full bg-[var(--ios-gray-6)] flex items-center justify-center"
          >
            <RefreshCw
              className={`w-5 h-5 text-[var(--ios-gray-1)] ${
                isFetching ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Desktop Greeting */}
      <div className="hidden md:block px-6 pt-4 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] text-[var(--ios-gray-1)] mb-1">
              {getTimeOfDayGreeting()}, {user?.firstName}
            </p>
            <p className="text-[13px] text-[var(--ios-gray-2)]">
              Here's your business overview for today
            </p>
          </div>
          <button
            onClick={() => refetchStats()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--ios-gray-6)] hover:bg-[var(--ios-gray-5)] transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 text-[var(--ios-gray-1)] ${
                isFetching ? "animate-spin" : ""
              }`}
            />
            <span className="text-[15px] text-[var(--ios-gray-1)]">
              Refresh
            </span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--ios-blue)]" />
        </div>
      ) : (
        <>
          {/* Main Stats Grid - Responsive */}
          <div className="px-4 md:px-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
            {/* Today's Revenue */}
            <div className="ios-stat-card md:p-5">
              <div className="flex items-center mb-2 md:mb-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-green-100 flex items-center justify-center mr-2 md:mr-3">
                  <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                </div>
                <span className="ios-stat-label mb-0 md:text-[15px]">
                  Revenue
                </span>
              </div>
              <p className="ios-stat-value text-[24px] md:text-[32px]">
                {formatCurrency(stats.today?.revenue)}
              </p>
              <div className="flex items-center mt-1 md:mt-2">
                <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4 text-green-600 mr-1" />
                <p className="text-[13px] md:text-[14px] text-green-600 font-medium">
                  {stats.today?.sales || 0} sales today
                </p>
              </div>
            </div>

            {/* Cash Balance */}
            <Link to="/cash" className="ios-stat-card md:p-5 group">
              <div className="flex items-center mb-2 md:mb-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-blue-100 flex items-center justify-center mr-2 md:mr-3">
                  <Wallet className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                </div>
                <span className="ios-stat-label mb-0 md:text-[15px]">Cash</span>
              </div>
              <p className="ios-stat-value text-[24px] md:text-[32px]">
                {formatCurrency(stats.totals?.cashBalance)}
              </p>
              <p className="text-[13px] md:text-[14px] text-[var(--ios-blue)] font-medium mt-1 md:mt-2 group-hover:underline">
                View details →
              </p>
            </Link>

            {/* Inventory */}
            <Link to="/products" className="ios-stat-card md:p-5 group">
              <div className="flex items-center mb-2 md:mb-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-purple-100 flex items-center justify-center mr-2 md:mr-3">
                  <Package className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
                </div>
                <span className="ios-stat-label mb-0 md:text-[15px]">
                  Stock Value
                </span>
              </div>
              <p className="ios-stat-value text-[24px] md:text-[32px]">
                {formatCurrency(stats.totals?.inventoryValue)}
              </p>
              <p className="text-[13px] md:text-[14px] text-[var(--ios-gray-1)] mt-1 md:mt-2">
                {stats.totals?.products || 0} products
              </p>
            </Link>

            {/* Low Stock */}
            <div className="ios-stat-card md:p-5">
              <div className="flex items-center mb-2 md:mb-3">
                <div
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center mr-2 md:mr-3 ${
                    (stats.totals?.lowStockItems || 0) > 0
                      ? "bg-red-100"
                      : "bg-green-100"
                  }`}
                >
                  <AlertTriangle
                    className={`w-4 h-4 md:w-5 md:h-5 ${
                      (stats.totals?.lowStockItems || 0) > 0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  />
                </div>
                <span className="ios-stat-label mb-0 md:text-[15px]">
                  Low Stock
                </span>
              </div>
              <p
                className={`ios-stat-value text-[24px] md:text-[32px] ${
                  (stats.totals?.lowStockItems || 0) > 0
                    ? "text-[var(--ios-red)]"
                    : "text-[var(--ios-green)]"
                }`}
              >
                {stats.totals?.lowStockItems || 0}
              </p>
              <p className="text-[13px] md:text-[14px] text-[var(--ios-gray-1)] mt-1 md:mt-2">
                items need restock
              </p>
            </div>
          </div>

          {/* Desktop: Two Column Layout */}
          <div className="md:grid md:grid-cols-3 md:gap-6 md:px-6">
            {/* Left Column - Main Content */}
            <div className="md:col-span-2 space-y-4 md:space-y-6">
              {/* Quick Actions */}
              <div className="ios-section md:bg-white md:rounded-xl md:p-0 md:py-4">
                <p className="ios-section-header md:px-5">Quick Actions</p>
                <div className="grid grid-cols-4 gap-2 px-4 md:px-5">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        key={action.name}
                        to={action.href}
                        className="flex flex-col items-center p-3 md:p-4 bg-white md:bg-[var(--ios-gray-6)] rounded-xl active:scale-95 md:hover:bg-[var(--ios-gray-5)] transition-all"
                      >
                        <div
                          className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mb-2"
                          style={{ backgroundColor: `${action.color}15` }}
                        >
                          <Icon
                            className="w-6 h-6 md:w-7 md:h-7"
                            style={{ color: action.color }}
                          />
                        </div>
                        <span className="text-[11px] md:text-[13px] font-medium text-[var(--ios-text-primary)] text-center">
                          {action.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* This Month Summary */}
              <div className="ios-section md:bg-white md:rounded-xl md:p-0 md:py-4">
                <p className="ios-section-header md:px-5">This Month</p>
                <div className="ios-list mx-4 md:mx-0 md:bg-transparent md:rounded-none">
                  <div className="ios-list-item md:px-5 md:hover:bg-transparent">
                    <span className="text-[17px] flex-1">Revenue</span>
                    <span className="text-[17px] font-semibold text-[var(--ios-green)]">
                      {formatCurrency(stats.thisMonth?.revenue)}
                    </span>
                  </div>
                  <div className="ios-list-item md:px-5 md:hover:bg-transparent">
                    <span className="text-[17px] flex-1">Expenses</span>
                    <span className="text-[17px] font-semibold text-[var(--ios-red)]">
                      {formatCurrency(stats.thisMonth?.expenses)}
                    </span>
                  </div>
                  <div className="ios-list-item md:px-5 md:hover:bg-transparent">
                    <span className="text-[17px] flex-1">Purchases</span>
                    <span className="text-[17px] font-semibold text-[var(--ios-orange)]">
                      {formatCurrency(stats.thisMonth?.purchases)}
                    </span>
                  </div>
                  <div className="ios-list-item md:px-5 md:hover:bg-transparent">
                    <span className="text-[17px] font-semibold flex-1">
                      Net Profit
                    </span>
                    <span
                      className={`text-[17px] font-bold ${
                        (stats.thisMonth?.profit || 0) >= 0
                          ? "text-[var(--ios-green)]"
                          : "text-[var(--ios-red)]"
                      }`}
                    >
                      {formatCurrency(stats.thisMonth?.profit)}
                    </span>
                  </div>
                </div>
                <p className="ios-section-footer md:px-5">
                  Profit margin:{" "}
                  {(stats.thisMonth?.profitMargin || 0).toFixed(1)}%
                </p>
              </div>

              {/* Business Overview - Mobile Only */}
              <div className="ios-section md:hidden">
                <p className="ios-section-header">Overview</p>
                <div className="ios-list mx-4">
                  <Link to="/customers" className="ios-list-item">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="ios-list-item-title flex-1">
                      Customers
                    </span>
                    <span className="text-[17px] text-[var(--ios-gray-1)] mr-2">
                      {stats.totals?.customers || 0}
                    </span>
                    <ChevronRight className="w-5 h-5 text-[var(--ios-gray-3)]" />
                  </Link>
                  <Link to="/suppliers" className="ios-list-item">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center mr-3">
                      <Truck className="w-4 h-4 text-orange-600" />
                    </div>
                    <span className="ios-list-item-title flex-1">
                      Suppliers
                    </span>
                    <span className="text-[17px] text-[var(--ios-gray-1)] mr-2">
                      {stats.totals?.suppliers || 0}
                    </span>
                    <ChevronRight className="w-5 h-5 text-[var(--ios-gray-3)]" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar Content */}
            <div className="space-y-4 md:space-y-6">
              {/* Business Overview - Desktop */}
              <div className="hidden md:block bg-white rounded-xl py-4">
                <p className="ios-section-header px-5 pb-3">
                  Business Overview
                </p>
                <div className="space-y-1">
                  <Link
                    to="/customers"
                    className="flex items-center px-5 py-3 hover:bg-[var(--ios-gray-6)] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mr-3">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] font-medium">Customers</p>
                      <p className="text-[13px] text-[var(--ios-gray-1)]">
                        {stats.totals?.customers || 0} total
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--ios-gray-3)]" />
                  </Link>
                  <Link
                    to="/suppliers"
                    className="flex items-center px-5 py-3 hover:bg-[var(--ios-gray-6)] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center mr-3">
                      <Truck className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] font-medium">Suppliers</p>
                      <p className="text-[13px] text-[var(--ios-gray-1)]">
                        {stats.totals?.suppliers || 0} total
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--ios-gray-3)]" />
                  </Link>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="ios-section md:bg-white md:rounded-xl md:py-4 md:p-0">
                <div className="flex items-center justify-between px-4 pb-2 md:px-5">
                  <p className="text-[13px] font-normal uppercase text-[var(--ios-gray-1)]">
                    Recent Activity
                  </p>
                  <Link
                    to="/reports"
                    className="text-[13px] text-[var(--ios-blue)]"
                  >
                    See All
                  </Link>
                </div>
                {activitiesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--ios-blue)]" />
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <Clock className="w-12 h-12 text-[var(--ios-gray-3)] mx-auto mb-3" />
                    <p className="text-[15px] text-[var(--ios-gray-1)]">
                      No recent activity
                    </p>
                    <p className="text-[13px] text-[var(--ios-gray-2)] mt-1">
                      Start making sales to see activity here
                    </p>
                  </div>
                ) : (
                  <div className="ios-list mx-4 md:mx-0 md:rounded-none md:bg-transparent">
                    {activities.slice(0, 5).map((activity) => {
                      const Icon = getActivityIcon(activity.type);
                      const isPositive = activity.amount >= 0;
                      return (
                        <div
                          key={activity.id}
                          className="ios-list-item md:px-5 md:hover:bg-[var(--ios-gray-6)]"
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                              activity.type === "sale"
                                ? "bg-green-100"
                                : activity.type === "expense"
                                ? "bg-red-100"
                                : activity.type === "purchase"
                                ? "bg-blue-100"
                                : "bg-gray-100"
                            }`}
                          >
                            <Icon
                              className={`w-5 h-5 ${
                                activity.type === "sale"
                                  ? "text-green-600"
                                  : activity.type === "expense"
                                  ? "text-red-600"
                                  : activity.type === "purchase"
                                  ? "text-blue-600"
                                  : "text-gray-600"
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] md:text-[15px] font-medium truncate">
                              {activity.title}
                            </p>
                            <p className="text-[13px] text-[var(--ios-gray-1)] truncate">
                              {activity.description}
                            </p>
                          </div>
                          <div className="text-right ml-3">
                            <p
                              className={`text-[15px] md:text-[15px] font-semibold ${
                                isPositive
                                  ? "text-[var(--ios-green)]"
                                  : "text-[var(--ios-red)]"
                              }`}
                            >
                              {isPositive ? "+" : ""}
                              {formatCurrency(Math.abs(activity.amount))}
                            </p>
                            <p className="text-[11px] text-[var(--ios-gray-2)]">
                              {new Date(activity.timestamp).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
