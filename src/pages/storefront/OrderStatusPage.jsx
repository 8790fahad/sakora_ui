import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, Package } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";

const OrderStatusPage = () => {
  const { slug, orderNumber } = useParams();
  const [params] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const response = await api.storefront.order(slug, orderNumber);
    setOrder(response.data.order);
    return response.data.order;
  };

  useEffect(() => {
    const run = async () => {
      try {
        let current = await load();
        if (
          params.get("mock") === "1" &&
          current.paymentStatus !== "paid"
        ) {
          const verified = await api.storefront.verify(slug, orderNumber, {
            mock: true,
          });
          current = verified.data.order;
          setOrder(current);
        } else if (current.paymentStatus !== "paid") {
          const verified = await api.storefront.verify(slug, orderNumber, {});
          if (verified.data.order) setOrder(verified.data.order);
        }
      } catch (error) {
        toast.error(error.message || "Could not load order");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [slug, orderNumber]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Confirming your order...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Order not found
      </div>
    );
  }

  const paid = order.paymentStatus === "paid";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl p-8 border">
        <div className="flex items-center gap-3">
          {paid ? (
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          ) : (
            <Clock className="w-10 h-10 text-amber-500" />
          )}
          <div>
            <p className="text-sm text-slate-500">{order.orderNumber}</p>
            <h1 className="text-2xl font-bold">
              {paid ? "Payment confirmed" : "Awaiting payment"}
            </h1>
          </div>
        </div>
        <p className="mt-4 text-slate-600">
          {paid
            ? "We received your Squad payment. You will get email and SMS updates as the order moves."
            : "Complete payment on Squad. This page updates once Squad confirms the transaction."}
        </p>
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
        <div className="mt-6 flex gap-3">
          <Link
            to={`/shop/${slug}`}
            className="flex-1 text-center py-3 rounded-xl bg-slate-100"
          >
            Back to shop
          </Link>
          {!paid && (
            <button
              onClick={async () => {
                const verified = await api.storefront.verify(slug, orderNumber, {
                  mock: params.get("mock") === "1",
                });
                setOrder(verified.data.order);
              }}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white"
            >
              Refresh payment
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderStatusPage;
