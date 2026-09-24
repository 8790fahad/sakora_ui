import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Package, Minus, Plus, ShoppingBag, Trash2, Store, MessageCircle, Search } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { openSquadCheckout } from "../../utils/squadCheckout";
import { whatsappLink, shareProductText, asSettings } from "../../utils/share";

const cartKey = (slug) => `sakora_cart_${slug}`;

const StorePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [step, setStep] = useState("shop");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    address: "",
    city: "",
    notes: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.storefront.get(slug);
        setStore(response.data.store);
        setProducts(response.data.products || []);
        const saved = localStorage.getItem(cartKey(slug));
        if (saved) setCart(JSON.parse(saved));
      } catch (error) {
        toast.error(error.message || "Store not found");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  useEffect(() => {
    if (slug) localStorage.setItem(cartKey(slug), JSON.stringify(cart));
  }, [cart, slug]);

  const formatMoney = (amount) =>
    `${store?.currencySymbol || "₦"}${parseFloat(amount || 0).toLocaleString()}`;

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unitPrice: parseFloat(product.sellingPrice),
          quantity: 1,
        },
      ];
    });
    toast.success(`${product.name} added`);
  };

  const updateQty = (productId, quantity) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  };

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cart]
  );

  const visibleProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  const settings = asSettings(store?.settings);
  const shopPhone = settings.whatsapp || store?.phone;

  const orderOnWhatsApp = (product) => {
    const text = shareProductText(store.name, product, window.location.href);
    window.open(whatsappLink(shopPhone, text), "_blank");
  };

  const checkout = async (event) => {
    event.preventDefault();
    if (!cart.length) return;
    setCheckingOut(true);
    try {
      const response = await api.storefront.checkout(slug, {
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        notes: form.notes,
        shippingAddress: {
          line1: form.address,
          city: form.city,
        },
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });
      localStorage.removeItem(cartKey(slug));
      const orderNumber = response.data.order.orderNumber;
      const payment = response.data.payment;
      if (payment.mock) {
        navigate(`/shop/${slug}/order/${orderNumber}?mock=1`);
        return;
      }
      if (payment.publicKey) {
        const result = await openSquadCheckout({
          publicKey: payment.publicKey,
          email: payment.email || form.customerEmail,
          amount: payment.amount || response.data.order.total,
          currency: payment.currency || "NGN",
          transactionRef: payment.reference,
          customerName: payment.customerName || form.customerName,
          callbackUrl: `${window.location.origin}/shop/${slug}/order/${orderNumber}`,
        });
        navigate(
          `/shop/${slug}/order/${orderNumber}${
            result.success ? "" : "?pending=1"
          }`
        );
        return;
      }
      if (payment.checkoutUrl) {
        window.location.href = payment.checkoutUrl;
        return;
      }
      navigate(`/shop/${slug}/order/${orderNumber}`);
    } catch (error) {
      toast.error(error.message || "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading store...</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Store className="w-10 h-10 mx-auto text-slate-400" />
          <h1 className="mt-3 text-xl font-semibold">Store not found</h1>
          <p className="text-slate-500">This shop is offline or does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-teal-50/40">
      <header className="bg-gradient-to-br from-teal-600 to-emerald-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-teal-100">Online shop</p>
            <h1 className="text-3xl font-bold">{store.name}</h1>
            <p className="text-teal-50 text-sm mt-1">
              {settings.tagline || "Order now. Pay with Squad or WhatsApp."}
            </p>
          </div>
          <div className="flex gap-2">
            {shopPhone && (
              <a
                href={whatsappLink(
                  shopPhone,
                  `Hi ${store.name}, I want to order from your shop`
                )}
                className="px-4 py-2 rounded-full bg-white text-teal-700 font-semibold text-sm flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
            )}
            <button
              onClick={() => setStep(step === "cart" ? "shop" : "cart")}
              className="relative px-4 py-2 rounded-full bg-white/15 font-medium text-sm flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              Cart
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-amber-400 text-teal-900 text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cart.reduce((n, item) => n + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2">
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products"
              className="w-full pl-9 pr-3 py-3 rounded-2xl border bg-white"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {visibleProducts.map((product) => (
              <article
                key={product.id}
                className="bg-white rounded-2xl p-4 border shadow-sm"
              >
                <div className="h-36 rounded-xl bg-teal-50 flex items-center justify-center mb-3">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full object-cover rounded-xl"
                    />
                  ) : (
                    <Package className="w-10 h-10 text-teal-300" />
                  )}
                </div>
                <h2 className="font-semibold text-slate-900">{product.name}</h2>
                <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px]">
                  {product.description || "Available in store and online"}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="font-bold text-teal-700">
                    {formatMoney(product.sellingPrice)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => orderOnWhatsApp(product)}
                      className="px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-sm"
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={() => addToCart(product)}
                      className="px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 text-sm font-medium"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!visibleProducts.length && (
            <div className="bg-white rounded-2xl p-10 text-center text-slate-500">
              No products match that search.
            </div>
          )}
        </section>

        <aside className="bg-white rounded-2xl border p-5 h-fit sticky top-6">
          <h2 className="font-semibold text-lg mb-4">Your order</h2>
          {!cart.length && (
            <p className="text-slate-500 text-sm">Your cart is empty.</p>
          )}
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.productId} className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-slate-500">
                    {formatMoney(item.unitPrice)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(item.productId, item.quantity - 1)}
                    className="p-1 rounded bg-slate-100"
                  >
                    {item.quantity === 1 ? (
                      <Trash2 className="w-4 h-4" />
                    ) : (
                      <Minus className="w-4 h-4" />
                    )}
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.productId, item.quantity + 1)}
                    className="p-1 rounded bg-slate-100"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </div>

          {step !== "checkout" ? (
            <button
              disabled={!cart.length}
              onClick={() => setStep("checkout")}
              className="mt-4 w-full py-3 rounded-xl bg-teal-600 text-white font-medium disabled:opacity-50"
            >
              Checkout with Squad
            </button>
          ) : (
            <form onSubmit={checkout} className="mt-4 space-y-3">
              <input
                required
                placeholder="Full name"
                className="w-full border rounded-xl px-3 py-2"
                value={form.customerName}
                onChange={(e) =>
                  setForm({ ...form, customerName: e.target.value })
                }
              />
              <input
                required
                type="email"
                placeholder="Email"
                className="w-full border rounded-xl px-3 py-2"
                value={form.customerEmail}
                onChange={(e) =>
                  setForm({ ...form, customerEmail: e.target.value })
                }
              />
              <input
                placeholder="Phone"
                className="w-full border rounded-xl px-3 py-2"
                value={form.customerPhone}
                onChange={(e) =>
                  setForm({ ...form, customerPhone: e.target.value })
                }
              />
              <input
                placeholder="Delivery address"
                className="w-full border rounded-xl px-3 py-2"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
              <input
                placeholder="City"
                className="w-full border rounded-xl px-3 py-2"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <textarea
                placeholder="Notes"
                className="w-full border rounded-xl px-3 py-2"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <button
                disabled={checkingOut}
                className="w-full py-3 rounded-xl bg-teal-600 text-white font-medium"
              >
                {checkingOut ? "Starting payment..." : "Pay with Squad"}
              </button>
            </form>
          )}
          <p className="mt-3 text-xs text-slate-400">
            Payments are processed by{" "}
            <a
              href="https://squadco.com/"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              Squad
            </a>
            .
          </p>
        </aside>
      </main>
    </div>
  );
};

export default StorePage;
