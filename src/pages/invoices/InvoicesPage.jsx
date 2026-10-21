import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { MessageCircle, Copy } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { whatsappLink, copyText, orderUrl } from "../../utils/share";

const InvoicesPage = () => {
  const queryClient = useQueryClient();
  const { data: productData } = useQuery("invoice-products", () =>
    api.products.list({ status: "active", limit: 100 })
  );
  const { data: orderData } = useQuery("invoice-orders", () =>
    api.orders.list({ limit: 20 })
  );
  const { data: shopData } = useQuery("storefront-settings", api.storefront.settings);
  const products = productData?.data?.items || [];
  const invoices = orderData?.data?.items || [];
  const shop = shopData?.data || {};

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    productId: "",
    quantity: 1,
  });

  const createInvoice = useMutation(api.orders.create, {
    onSuccess: async (response) => {
      toast.success("Invoice created");
      queryClient.invalidateQueries("invoice-orders");
      const url = response.data?.invoiceUrl;
      if (form.customerPhone && url) {
        window.open(
          whatsappLink(
            form.customerPhone,
            `Hi ${form.customerName}, here is your invoice from ${shop.name || shop.slug || "our shop"}: ${url}`
          ),
          "_blank"
        );
      }
    },
    onError: (error) => {
      toast.error(error.message || "Could not create invoice");
    },
  });

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-slate-500">
          Create a bill, send it on WhatsApp, and collect payment with Squad.
        </p>
      </div>

      <form
        className="bg-white rounded-2xl border p-5 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          createInvoice.mutate({
            customerName: form.customerName,
            customerPhone: form.customerPhone,
            customerEmail: form.customerEmail || undefined,
            items: [{ productId: form.productId, quantity: form.quantity }],
          });
        }}
      >
        <input
          required
          placeholder="Customer name"
          className="w-full border rounded-xl px-3 py-2"
          value={form.customerName}
          onChange={(e) => setForm({ ...form, customerName: e.target.value })}
        />
        <input
          placeholder="WhatsApp number"
          className="w-full border rounded-xl px-3 py-2"
          value={form.customerPhone}
          onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
        />
        <input
          type="email"
          placeholder="Email (for Squad receipt)"
          className="w-full border rounded-xl px-3 py-2"
          value={form.customerEmail}
          onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
        />
        <div className="grid grid-cols-3 gap-2">
          <select
            required
            className="col-span-2 border rounded-xl px-3 py-2"
            value={form.productId}
            onChange={(e) => setForm({ ...form, productId: e.target.value })}
          >
            <option value="">Select product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} — ₦{parseFloat(product.sellingPrice).toLocaleString()}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            className="border rounded-xl px-3 py-2"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
        </div>
        <button className="w-full py-3 rounded-xl bg-teal-600 text-white font-medium">
          Create & share invoice
        </button>
      </form>

      <div className="space-y-3">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="bg-white rounded-2xl border p-4">
            <div className="flex justify-between">
              <div>
                <p className="font-semibold">{invoice.orderNumber}</p>
                <p className="text-sm text-slate-500">{invoice.customerName}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">
                  ₦{parseFloat(invoice.total).toLocaleString()}
                </p>
                <p className="text-xs uppercase text-slate-500">
                  {invoice.paymentStatus}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  const url = orderUrl(shop.slug, invoice.orderNumber);
                  copyText(url);
                  toast.success("Invoice link copied");
                }}
                className="px-3 py-1.5 rounded-full bg-slate-100 text-sm flex items-center gap-1"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
              {invoice.customerPhone && (
                <a
                  href={whatsappLink(
                    invoice.customerPhone,
                    `Invoice ${invoice.orderNumber}: ${orderUrl(shop.slug, invoice.orderNumber)}`
                  )}
                  className="px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-sm flex items-center gap-1"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvoicesPage;
