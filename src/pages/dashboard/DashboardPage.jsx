import React from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Package,
  ShoppingCart,
  Receipt,
  MessageCircle,
  Copy,
  AlertTriangle,
  ClipboardList,
  Store,
  Loader2,
  Plus,
} from "lucide-react";
import { useQuery } from "react-query";
import toast from "react-hot-toast";
import { selectUser } from "../../store/slices/authSlice";
import api from "../../services/api";
import { shopUrl, shareShopText, whatsappLink, copyText } from "../../utils/share";

const DashboardPage = () => {
  const user = useSelector(selectUser);

  const { data: statsData, isLoading } = useQuery(
    "dashboard-stats",
    api.dashboard.stats,
    { refetchOnWindowFocus: false, refetchInterval: 120000 }
  );
  const { data: shopData } = useQuery(
    "storefront-settings",
    api.storefront.settings,
    { refetchOnWindowFocus: false }
  );
  const { data: ordersData } = useQuery(
    "home-orders",
    () => api.orders.list({ limit: 5 }),
    { refetchOnWindowFocus: false }
  );

  const stats = statsData?.data || {};
  const shop = shopData?.data || {};
  const orders = ordersData?.data?.items || [];
  const slug = shop.slug || user?.business?.storefrontSlug;
  const url = slug ? shopUrl(slug) : shop.url;

  const money = (amount) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount || 0);

  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const shareShop = async (viaWhatsApp) => {
    if (!url) {
      toast.error("Turn on your shop first");
      return;
    }
    const text = shareShopText(user?.business?.name || "my shop", url);
    if (viaWhatsApp) {
      window.open(whatsappLink("", text), "_blank");
      return;
    }
    await copyText(url);
    toast.success("Shop link copied");
  };

  const actions = [
    { name: "Record sale", href: "/sales", icon: ShoppingCart },
    { name: "Add product", href: "/products", icon: Plus },
    { name: "Invoice", href: "/invoices", icon: Receipt },
    { name: "Orders", href: "/orders", icon: ClipboardList },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--ios-blue)]" />
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="px-4 pt-3 pb-5 bg-gradient-to-br from-teal-600 to-emerald-700 text-white md:mx-6 md:mt-4 md:rounded-3xl">
        <p className="text-white/80 text-sm">
          {hello}, {user?.firstName}
        </p>
        <h1 className="text-2xl font-bold mt-1">{user?.business?.name}</h1>
        <p className="text-3xl font-extrabold mt-4">
          {money(stats.today?.revenue)}
        </p>
        <p className="text-white/80 text-sm">
          {stats.today?.sales || 0} sales today
        </p>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => shareShop(true)}
            className="flex-1 py-2.5 rounded-full bg-white text-teal-700 font-semibold text-sm flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Share shop
          </button>
          <button
            onClick={() => shareShop(false)}
            className="px-4 py-2.5 rounded-full bg-white/15 font-medium text-sm flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Copy link
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 px-4 md:px-6 mt-5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.name}
              to={action.href}
              className="flex flex-col items-center bg-white rounded-2xl py-3 px-1 shadow-sm"
            >
              <div className="w-11 h-11 rounded-full bg-teal-50 flex items-center justify-center mb-1">
                <Icon className="w-5 h-5 text-teal-700" />
              </div>
              <span className="text-[11px] font-medium text-center">{action.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="px-4 md:px-6 mt-5 grid grid-cols-2 gap-3">
        <Link to="/products" className="bg-white rounded-2xl p-4 shadow-sm">
          <Package className="w-5 h-5 text-teal-600 mb-2" />
          <p className="text-2xl font-bold">{stats.totals?.products || 0}</p>
          <p className="text-sm text-slate-500">Products</p>
        </Link>
        <Link to="/orders" className="bg-white rounded-2xl p-4 shadow-sm">
          <ClipboardList className="w-5 h-5 text-orange-500 mb-2" />
          <p className="text-2xl font-bold">{orders.length}</p>
          <p className="text-sm text-slate-500">Recent orders</p>
        </Link>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-500 mb-2" />
          <p className="text-2xl font-bold">{stats.totals?.lowStockItems || 0}</p>
          <p className="text-sm text-slate-500">Low stock</p>
        </div>
        <Link to="/storefront" className="bg-white rounded-2xl p-4 shadow-sm">
          <Store className="w-5 h-5 text-teal-600 mb-2" />
          <p className="text-sm font-semibold truncate">{slug || "Set up shop"}</p>
          <p className="text-sm text-slate-500">Your website</p>
        </Link>
      </div>

      <div className="px-4 md:px-6 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Latest orders</h2>
          <Link to="/orders" className="text-sm text-teal-700">See all</Link>
        </div>
        <div className="bg-white rounded-2xl divide-y shadow-sm">
          {orders.slice(0, 4).map((order) => (
            <div key={order.id} className="px-4 py-3 flex justify-between">
              <div>
                <p className="font-medium">{order.customerName}</p>
                <p className="text-xs text-slate-500">
                  {order.orderNumber} · {order.status}
                </p>
              </div>
              <p className="font-semibold">{money(order.total)}</p>
            </div>
          ))}
          {!orders.length && (
            <p className="p-4 text-sm text-slate-500">
              No online orders yet. Share your shop on WhatsApp to start selling.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
