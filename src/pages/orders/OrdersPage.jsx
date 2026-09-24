import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { ClipboardList, Loader2, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { whatsappLink } from "../../utils/share";

const STATUSES = [
  "pending",
  "paid",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
];

const OrdersPage = () => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery(
    ["orders", status],
    () => api.orders.list({ status: status || undefined, limit: 50 }),
    { refetchOnWindowFocus: true }
  );

  const updateStatus = useMutation(
    ({ id, next }) => api.orders.updateStatus(id, next),
    {
      onSuccess: () => {
        toast.success("Order updated. Customer will be notified.");
        queryClient.invalidateQueries("orders");
        setSelected(null);
      },
    }
  );

  const orders = data?.data?.items || [];

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-slate-500">WhatsApp, shop, and invoice orders in one place</p>
        </div>
        <select
          className="border rounded-xl px-3 py-2"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}

      {!isLoading && !orders.length && (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-500">
          <ClipboardList className="w-10 h-10 mx-auto mb-3" />
          No online orders yet. Share your storefront link to start receiving them.
        </div>
      )}

      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-2xl p-4 border">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{order.orderNumber}</p>
                <p className="text-sm text-slate-500">
                  {order.customerName} · {order.customerEmail}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">
                  ₦{parseFloat(order.total).toLocaleString()}
                </p>
                <p className="text-xs uppercase text-slate-500">
                  {order.paymentStatus} · {order.status}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {STATUSES.map((next) => (
                <button
                  key={next}
                  onClick={() => updateStatus.mutate({ id: order.id, next })}
                  className={`px-3 py-1 rounded-full text-xs ${
                    order.status === next
                      ? "bg-teal-600 text-white"
                      : "bg-slate-100"
                  }`}
                >
                  {next}
                </button>
              ))}
              <button
                onClick={() => setSelected(order)}
                className="px-3 py-1 rounded-full text-xs bg-slate-900 text-white"
              >
                Details
              </button>
              {order.customerPhone && (
                <a
                  href={whatsappLink(
                    order.customerPhone,
                    `Hi ${order.customerName}, your order ${order.orderNumber} is ${order.status}. Total ₦${parseFloat(order.total).toLocaleString()}.`
                  )}
                  className="px-3 py-1 rounded-full text-xs bg-green-50 text-green-700 flex items-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" />
                  WhatsApp
                </a>
              )}
            </div>
            {selected?.id === order.id && (
              <div className="mt-4 pt-3 border-t text-sm space-y-1">
                {(order.items || []).map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>
                      {item.name} × {parseFloat(item.quantity)}
                    </span>
                    <span>₦{parseFloat(item.totalPrice).toLocaleString()}</span>
                  </div>
                ))}
                {order.shippingAddress?.line1 && (
                  <p className="text-slate-500 pt-2">
                    Ship to {order.shippingAddress.line1},{" "}
                    {order.shippingAddress.city}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrdersPage;
