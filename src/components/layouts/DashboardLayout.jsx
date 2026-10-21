import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Package,
  ShoppingCart,
  TrendingUp,
  Receipt,
  Users,
  Truck,
  Wallet,
  BarChart3,
  Settings,
  Bell,
  Search,
  Plus,
  LogOut,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeft,
  ClipboardList,
  Store,
  CreditCard,
  Shield,
  Percent,
  LifeBuoy,
  Gift,
} from "lucide-react";

import { selectUser, logoutUser } from "../../store/slices/authSlice";
import api from "../../services/api";
import { applyBrandColors } from "../../utils/brandImage";

const DashboardLayout = ({ children }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const can = (permission) =>
    user?.role === "owner" || (user?.permissions || []).includes(permission);

  const [showMore, setShowMore] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [remoteNotes, setRemoteNotes] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [brandLogo, setBrandLogo] = useState(null);
  const [businessName, setBusinessName] = useState("");

  const loadNotifications = async () => {
    try {
      const response = await api.notifications.list({ limit: 20 });
      setRemoteNotes(response.data.items || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      // ignore if the user cannot view notifications
    }
  };

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 20000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await api.settings.get();
        const business = response?.data?.business || {};
        if (cancelled) return;
        applyBrandColors({
          primaryColor: business.primaryColor,
          secondaryColor: business.secondaryColor,
        });
        setBrandLogo(business.logo || null);
        setBusinessName(business.name || "");
      } catch (error) {
        // keep default Sakora theme
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allNavItems = [
    { name: "Home", href: "/dashboard", icon: Home, color: "#007AFF", permission: "dashboard.view" },
    { name: "Products", href: "/products", icon: Package, color: "#5856D6", permission: "products.view" },
    { name: "Sales", href: "/sales", icon: ShoppingCart, color: "#34C759", permission: "sales.view" },
    { name: "Orders", href: "/orders", icon: ClipboardList, color: "#FF9500", permission: "orders.view" },
    { name: "Storefront", href: "/storefront", icon: Store, color: "#5AC8FA", permission: "storefront.manage" },
    { name: "Invoices", href: "/invoices", icon: Receipt, color: "#FF9500", permission: "orders.manage" },
    { name: "Cash", href: "/cash", icon: Wallet, color: "#007AFF", permission: "cash.view" },
    { name: "Purchases", href: "/purchases", icon: TrendingUp, color: "#AF52DE", permission: "purchases.view" },
    { name: "Expenses", href: "/expenses", icon: Receipt, color: "#FF9500", permission: "expenses.view" },
    { name: "Customers", href: "/customers", icon: Users, color: "#5AC8FA", permission: "customers.view" },
    { name: "Suppliers", href: "/suppliers", icon: Truck, color: "#FF3B30", permission: "suppliers.view" },
    { name: "Reports", href: "/reports", icon: BarChart3, color: "#34C759", permission: "reports.view" },
    { name: "VAT", href: "/vat", icon: Percent, color: "#0D9488", permission: "reports.view" },
    { name: "Team", href: "/team", icon: Shield, color: "#5856D6", permission: "team.view" },
    { name: "Billing", href: "/billing", icon: CreditCard, color: "#34C759", permission: "billing.manage" },
    { name: "Referrals", href: "/referrals", icon: Gift, color: "#AF52DE", permission: "billing.manage" },
    { name: "Support", href: "/support", icon: LifeBuoy, color: "#0D9488" },
  ].filter((item) => !item.permission || can(item.permission));

  const unreadNotifications = unreadCount;

  // Mobile tab bar items (5 items for iOS standard)
  const tabBarItems = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Products", href: "/products", icon: Package },
    { name: "Orders", href: "/orders", icon: ClipboardList },
    { name: "Sales", href: "/sales", icon: ShoppingCart },
    { name: "More", href: "#more", icon: MoreHorizontal, isMore: true },
  ];

  const moreMenuItems = allNavItems.filter(
    (item) => !["/dashboard", "/products", "/orders", "/sales"].includes(item.href)
  );

  const handleLogout = () => {
    dispatch(logoutUser());
  };

  const isActive = (href) => {
    if (href === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(href);
  };

  const getPageTitle = () => {
    const path = location.pathname;
    const item = allNavItems.find(
      (i) => i.href === path || path.startsWith(i.href)
    );
    return item?.name || "sakora";
  };

  return (
    <div className="min-h-screen bg-[var(--ios-bg-grouped)]">
      {/* ==================== iPadOS/macOS SIDEBAR (md and up) ==================== */}
      <aside
        className={`hidden md:fixed md:inset-y-0 md:left-0 md:z-50 md:flex md:flex-col transition-all duration-300 ${
          sidebarCollapsed ? "md:w-20" : "md:w-72"
        }`}
        style={{
          background: "rgba(242, 242, 247, 0.8)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          borderRight: "0.5px solid var(--ios-separator)",
        }}
      >
        {/* Sidebar Header */}
        <div
          className={`flex items-center h-14 px-4 border-b`}
          style={{ borderColor: "var(--ios-separator)" }}
        >
          {!sidebarCollapsed && (
            <>
              <img
                src={brandLogo || "/brand.svg"}
                alt=""
                className="w-8 h-8 rounded-lg object-contain bg-white"
              />
              <span className="ml-3 text-[17px] font-semibold text-[var(--ios-text-primary)] truncate">
                {businessName || "sakora"}
              </span>
            </>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`p-2 rounded-lg hover:bg-black/5 transition-colors ${
              sidebarCollapsed ? "mx-auto" : "ml-auto"
            }`}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="w-5 h-5 text-[var(--ios-gray-1)]" />
            ) : (
              <PanelLeftClose className="w-5 h-5 text-[var(--ios-gray-1)]" />
            )}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center rounded-xl transition-all duration-200 ${
                    sidebarCollapsed ? "justify-center p-3" : "px-3 py-2.5"
                  } ${
                    active
                      ? "bg-[var(--ios-blue)] text-white shadow-sm"
                      : "text-[var(--ios-text-primary)] hover:bg-black/5"
                  }`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <div
                    className={`flex items-center justify-center flex-shrink-0 ${
                      sidebarCollapsed ? "" : "w-8 h-8 rounded-lg mr-3"
                    }`}
                    style={
                      !active && !sidebarCollapsed
                        ? { backgroundColor: `${item.color}15` }
                        : active && !sidebarCollapsed
                        ? { backgroundColor: "rgba(255,255,255,0.2)" }
                        : {}
                    }
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color: active ? "white" : item.color }}
                    />
                  </div>
                  {!sidebarCollapsed && (
                    <span
                      className={`text-[15px] font-medium ${
                        active ? "text-white" : ""
                      }`}
                    >
                      {item.name}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Sidebar User Section */}
        <div
          className="p-3 border-t"
          style={{ borderColor: "var(--ios-separator)" }}
        >
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Link
                to="/profile"
                className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--ios-blue)] to-[var(--ios-purple)] flex items-center justify-center"
                title="Profile"
              >
                <span className="text-white text-sm font-semibold">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </span>
              </Link>
              <Link
                to="/settings"
                className={`p-2 rounded-lg transition-colors ${
                  isActive("/settings")
                    ? "bg-[var(--ios-blue)] text-white"
                    : "text-[var(--ios-gray-1)] hover:bg-black/5 hover:text-[var(--ios-blue)]"
                }`}
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-[var(--ios-red)] hover:bg-red-50 transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <Link
                to="/settings"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  isActive("/settings")
                    ? "bg-[var(--ios-blue)] text-white shadow-sm"
                    : "text-[var(--ios-text-primary)] hover:bg-black/5"
                }`}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: isActive("/settings")
                      ? "rgba(255,255,255,0.2)"
                      : "#8E8E9315",
                  }}
                >
                  <Settings
                    className="w-5 h-5"
                    style={{
                      color: isActive("/settings") ? "white" : "#8E8E93",
                    }}
                  />
                </div>
                <span className="text-[15px] font-medium">Settings</span>
              </Link>
              <div className="flex items-center p-2 rounded-xl hover:bg-black/5 transition-colors">
                <Link
                  to="/profile"
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--ios-blue)] to-[var(--ios-purple)] flex items-center justify-center flex-shrink-0"
                >
                  <span className="text-white font-semibold">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </span>
                </Link>
                <Link to="/profile" className="ml-3 flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[var(--ios-text-primary)] truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-[13px] text-[var(--ios-gray-1)] truncate">
                    {user?.business?.name}
                  </p>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-[var(--ios-gray-1)] hover:text-[var(--ios-red)] hover:bg-red-50 transition-colors"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ==================== MAIN CONTENT AREA ==================== */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "md:pl-20" : "md:pl-72"
        }`}
      >
        {/* iOS Navigation Bar (visible on all sizes) */}
        <header
          className="sticky top-0 z-40 md:relative"
          style={{
            background: "rgba(249, 249, 249, 0.94)",
            backdropFilter: "saturate(180%) blur(20px)",
            WebkitBackdropFilter: "saturate(180%) blur(20px)",
            borderBottom: "0.5px solid var(--ios-separator)",
          }}
        >
          <div className="flex items-center justify-between h-14 px-4">
            {/* Left Section */}
            <div className="w-24 flex justify-start md:hidden">
              {location.pathname !== "/dashboard" && (
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center text-[var(--ios-blue)] touch-feedback"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-[17px]">Back</span>
                </button>
              )}
            </div>

            {/* Title - Mobile only shows title, Desktop shows large title */}
            <h1 className="text-[17px] font-semibold text-[var(--ios-text-primary)] md:text-left md:flex-1 md:text-[28px] md:font-bold md:tracking-tight">
              {getPageTitle()}
            </h1>

            {/* Right Buttons */}
            <div className="w-24 flex justify-end items-center gap-1 md:w-auto">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2.5 rounded-full text-[var(--ios-blue)] hover:bg-[var(--ios-blue)]/10 transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 rounded-full text-[var(--ios-blue)] hover:bg-[var(--ios-blue)]/10 transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="ios-badge absolute -top-0.5 -right-0.5 min-w-[18px]">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </button>
              {/* Desktop: Quick Action Button (hidden on Products — page has New Product) */}
              {!location.pathname.startsWith("/products") && (
                <button
                  onClick={() => navigate("/sales")}
                  className="hidden md:flex items-center gap-2 ml-2 px-4 py-2 bg-[var(--ios-blue)] text-white rounded-full text-[15px] font-medium hover:bg-[var(--ios-blue)]/90 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Sale
                </button>
              )}
            </div>
          </div>

          {/* Search Bar (expandable) */}
          {showSearch && (
            <div className="px-4 pb-3">
              <div className="ios-search-input-wrapper">
                <Search className="ios-search-icon" />
                <input
                  type="search"
                  placeholder="Search products, sales, customers..."
                  className="ios-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          )}
          {showNotifications && (
            <div className="absolute right-4 top-16 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border z-50 overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between border-b">
                <p className="font-semibold">Notifications</p>
                <button
                  className="text-xs text-blue-600"
                  onClick={async () => {
                    await api.notifications.markAllRead();
                    loadNotifications();
                  }}
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {remoteNotes.map((note) => (
                  <button
                    key={note.id}
                    className={`w-full text-left px-4 py-3 border-b ${
                      note.isRead ? "bg-white" : "bg-blue-50"
                    }`}
                    onClick={async () => {
                      await api.notifications.markRead(note.id);
                      if (note.actionUrl) navigate(note.actionUrl);
                      setShowNotifications(false);
                      loadNotifications();
                    }}
                  >
                    <p className="text-sm font-medium">{note.title}</p>
                    <p className="text-xs text-slate-500">{note.message}</p>
                  </button>
                ))}
                {!remoteNotes.length && (
                  <p className="p-4 text-sm text-slate-500">No notifications yet.</p>
                )}
              </div>
            </div>
          )}
        </header>

        {/* Page Content */}
        <main
          className="min-h-[calc(100vh-var(--tab-bar-height)-56px)] md:min-h-[calc(100vh-56px)] pb-[var(--tab-bar-height)] md:pb-6"
          style={{ paddingTop: "0" }}
        >
          {children}
        </main>
      </div>

      {/* ==================== MOBILE TAB BAR (md and below) ==================== */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 block md:hidden"
        style={{
          background: "rgba(249, 249, 249, 0.94)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          borderTop: "0.5px solid var(--ios-separator)",
          paddingBottom: "env(safe-area-inset-bottom)",
          height: "var(--tab-bar-height)",
        }}
      >
        <div className="flex items-center justify-around h-[calc(var(--tab-bar-height)-env(safe-area-inset-bottom))]">
          {tabBarItems.map((item) => {
            const Icon = item.icon;
            const active = item.isMore ? showMore : isActive(item.href);

            if (item.isMore) {
              return (
                <button
                  key={item.name}
                  onClick={() => setShowMore(true)}
                  className={`ios-tab-item ${active ? "active" : ""}`}
                >
                  <Icon className="ios-tab-item-icon" />
                  <span className="ios-tab-item-label">{item.name}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`ios-tab-item ${active ? "active" : ""}`}
              >
                <Icon className="ios-tab-item-icon" />
                <span className="ios-tab-item-label">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ==================== MOBILE MORE SHEET ==================== */}
      {showMore && (
        <>
          <div
            className="ios-sheet-overlay md:hidden"
            onClick={() => setShowMore(false)}
          />
          <div className="ios-sheet md:hidden">
            <div className="ios-sheet-handle" />

            {/* User Profile Section */}
            <div className="px-4 pb-4">
              <div className="ios-card-inset mx-0">
                <Link
                  to="/profile"
                  onClick={() => setShowMore(false)}
                  className="ios-list-item"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--ios-blue)] to-[var(--ios-purple)] flex items-center justify-center mr-3">
                    <span className="text-white text-lg font-semibold">
                      {user?.firstName?.[0]}
                      {user?.lastName?.[0]}
                    </span>
                  </div>
                  <div className="ios-list-item-content">
                    <p className="ios-list-item-title font-semibold">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="ios-list-item-subtitle">
                      {user?.business?.name}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[var(--ios-gray-3)]" />
                </Link>
              </div>
            </div>

            {/* Settings — always visible */}
            <div className="ios-section">
              <p className="ios-section-header">Account</p>
              <div className="ios-list mx-4">
                <Link
                  to="/settings"
                  onClick={() => setShowMore(false)}
                  className="ios-list-item"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                    style={{ backgroundColor: "#8E8E9320" }}
                  >
                    <Settings className="w-4 h-4" style={{ color: "#8E8E93" }} />
                  </div>
                  <span className="ios-list-item-title flex-1">Settings</span>
                  <ChevronRight className="w-5 h-5 text-[var(--ios-gray-3)]" />
                </Link>
              </div>
            </div>

            {/* More Menu Items */}
            <div className="ios-section">
              <p className="ios-section-header">More Options</p>
              <div className="ios-list mx-4">
                {moreMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setShowMore(false)}
                      className="ios-list-item"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                        style={{ backgroundColor: `${item.color}20` }}
                      >
                        <Icon
                          className="w-4 h-4"
                          style={{ color: item.color }}
                        />
                      </div>
                      <span className="ios-list-item-title flex-1">
                        {item.name}
                      </span>
                      <ChevronRight className="w-5 h-5 text-[var(--ios-gray-3)]" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Sign Out */}
            <div className="ios-section pb-8">
              <div className="ios-list mx-4">
                <button
                  onClick={() => {
                    setShowMore(false);
                    handleLogout();
                  }}
                  className="ios-list-item w-full justify-center"
                >
                  <LogOut className="w-5 h-5 mr-2 text-[var(--ios-red)]" />
                  <span className="text-[var(--ios-red)] text-[17px]">
                    Sign Out
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==================== MOBILE FAB ==================== */}
      {!location.pathname.startsWith("/products") && (
        <button
          onClick={() => navigate("/sales")}
          className="md:hidden fixed z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center bg-[var(--ios-blue)] active:scale-95 transition-transform"
          style={{
            right: "20px",
            bottom: "calc(var(--tab-bar-height) + 16px)",
          }}
          aria-label="New Sale"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      )}
    </div>
  );
};

export default DashboardLayout;
