import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Package, Printer, Search } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { shopUrl } from "../../utils/share";

const STATUS_STEPS = [
  "pending",
  "paid",
  "processing",
  "packed",
  "shipped",
  "delivered",
];

const normalizeShop = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const TrackOrderPage = () => {
  const [params, setParams] = useSearchParams();
  const [shop, setShop] = useState(params.get("shop") || "");
  const [orderNumber, setOrderNumber] = useState(params.get("order") || "");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [showComplaint, setShowComplaint] = useState(false);
  const [complaint, setComplaint] = useState({
    name: "",
    contact: "",
    message: "",
  });
  const [sending, setSending] = useState(false);

  const lookup = async (event) => {
    event?.preventDefault?.();
    const slug = normalizeShop(shop);
    const number = String(orderNumber || "").trim();
    setOrder(null);
    setShowComplaint(false);

    if (!slug) {
      toast.error("Enter the shop name from your link");
      return;
    }
    if (!number) {
      toast.error("Enter your order number");
      return;
    }

    setLoading(true);
    try {
      const response = await api.storefront.order(slug, number);
      const found = response?.data?.order || null;
      setOrder(found);
      if (found) {
        setComplaint({
          name: found.customerName || "",
          contact: found.customerPhone || found.customerEmail || "",
          message: "",
        });
      }
      setParams({ shop: slug, order: number }, { replace: true });
    } catch (error) {
      toast.error(error.message || "Order not found");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.get("shop") && params.get("order")) {
      lookup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stepIndex = order ? Math.max(0, STATUS_STEPS.indexOf(order.status)) : -1;
  const slug = normalizeShop(shop);

  const sendComplaint = async (event) => {
    event.preventDefault();
    if (!slug || !order) return;
    if (String(complaint.message || "").trim().length < 5) {
      toast.error("Please describe the issue (at least 5 characters)");
      return;
    }
    setSending(true);
    try {
      await api.storefront.complaint(slug, order.orderNumber, complaint);
      toast.success("Complaint sent. The shop will follow up shortly.");
      setComplaint((c) => ({ ...c, message: "" }));
      setShowComplaint(false);
    } catch (error) {
      toast.error(error.message || "Could not send complaint");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8 no-print">
          <Package className="w-12 h-12 mx-auto text-teal-600" />
          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            Track your order
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Use shop name <span className="font-medium">sakora-demo</span> and
            your order number.
          </p>
        </div>

        <form
          onSubmit={lookup}
          className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm no-print"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shop name
            </label>
            <input
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              placeholder="sakora-demo"
              className="form-input w-full"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order number
            </label>
            <input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="ORDDBEE26090001"
              className="form-input w-full"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            <Search className="w-4 h-4 mr-2" />
            {loading ? "Looking up..." : "Track order"}
          </button>
        </form>

        {order && (
          <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <p className="text-sm text-gray-500">{order.orderNumber}</p>
            <h2 className="text-xl font-bold text-gray-900 capitalize">
              {order.status === "shipped"
                ? "Out for delivery"
                : order.status === "delivered"
                ? "Delivered"
                : order.paymentStatus === "paid"
                ? "Order in progress"
                : "Awaiting payment"}
            </h2>
            <p className="text-sm text-gray-500 capitalize mt-1">
              Status: {order.status} · Payment: {order.paymentStatus}
            </p>

            {order.status !== "cancelled" && order.status !== "refunded" && (
              <div className="mt-6 flex justify-between gap-1">
                {STATUS_STEPS.map((step, index) => (
                  <div key={step} className="flex-1 text-center">
                    <div
                      className={`mx-auto h-2 rounded-full ${
                        index <= stepIndex ? "bg-teal-600" : "bg-gray-200"
                      }`}
                    />
                    <p
                      className={`mt-1 text-[10px] capitalize ${
                        index <= stepIndex
                          ? "text-teal-700 font-medium"
                          : "text-gray-400"
                      }`}
                    >
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 space-y-2">
              {(order.items || []).map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.name} × {parseFloat(item.quantity)}
                  </span>
                  <span>₦{parseFloat(item.totalPrice).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between font-semibold">
              <span>Total</span>
              <span>₦{parseFloat(order.total).toLocaleString()}</span>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-primary w-full"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </button>
              <button
                type="button"
                onClick={() => setShowComplaint((v) => !v)}
                className="w-full py-3 rounded-xl border border-amber-400 text-amber-800 font-medium bg-white"
              >
                {showComplaint ? "Cancel complaint" : "Report a problem"}
              </button>
              {slug ? (
                <a
                  href={shopUrl(slug)}
                  className="sm:col-span-2 block text-center py-3 rounded-xl bg-gray-100 font-medium text-teal-700"
                >
                  Open shop
                </a>
              ) : null}
            </div>

            {showComplaint ? (
              <form
                onSubmit={sendComplaint}
                className="mt-6 pt-6 border-t space-y-3 no-print"
              >
                <h3 className="font-semibold text-gray-900">Report / complaint</h3>
                <p className="text-sm text-gray-500">
                  Tell the shop what went wrong with this order.
                </p>
                <input
                  value={complaint.name}
                  onChange={(e) =>
                    setComplaint((c) => ({ ...c, name: e.target.value }))
                  }
                  placeholder="Your name"
                  className="form-input w-full"
                />
                <input
                  value={complaint.contact}
                  onChange={(e) =>
                    setComplaint((c) => ({ ...c, contact: e.target.value }))
                  }
                  placeholder="Phone or email"
                  className="form-input w-full"
                />
                <textarea
                  rows={4}
                  value={complaint.message}
                  onChange={(e) =>
                    setComplaint((c) => ({ ...c, message: e.target.value }))
                  }
                  placeholder="Describe the issue..."
                  required
                  className="form-input w-full"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3 rounded-xl bg-amber-600 text-white font-medium disabled:opacity-60"
                >
                  {sending ? "Sending..." : "Submit complaint"}
                </button>
              </form>
            ) : null}
          </div>
        )}

        <div className="mt-8 space-y-2 text-center text-sm text-gray-500 no-print">
          <Link to="/login" className="text-teal-700 font-medium">
            Merchant sign in
          </Link>
          <p className="text-xs text-gray-400">
            Powered by{" "}
            <a
              href="https://nexifour.ng"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-gray-500 hover:text-teal-700"
            >
              Nexifour Limited
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrackOrderPage;
