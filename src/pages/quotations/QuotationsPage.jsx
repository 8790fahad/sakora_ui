import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useSelector } from "react-redux";
import { Mail, MessageCircle, Printer, Save } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { selectUser } from "../../store/slices/authSlice";
import { whatsappLink } from "../../utils/share";
import {
  buildQuotationHtml,
  getDocPrintSettings,
  getDocumentPreviewSrc,
  printQuotation,
} from "../../utils/salesDocuments";

const MM_TO_PX = 96 / 25.4;

const paperPixels = (paperFormat, orientation) => {
  const sizes = {
    a4: orientation === "landscape" ? [297, 210] : [210, 297],
    a5: orientation === "landscape" ? [210, 148] : [148, 210],
    thermal: [80, 280],
  };
  const [widthMm, heightMm] = sizes[paperFormat] || sizes.a4;
  return {
    width: Math.ceil(widthMm * MM_TO_PX) + 32,
    height: Math.ceil(heightMm * MM_TO_PX) + 32,
  };
};

const FittedDocumentPreview = ({ src, paperFormat, orientation }) => {
  const boxRef = useRef(null);
  const [boxWidth, setBoxWidth] = useState(0);

  useEffect(() => {
    const node = boxRef.current;
    if (!node) return undefined;
    const measure = () => setBoxWidth(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const paper = paperPixels(paperFormat, orientation);
  const scale = boxWidth > 0 ? Math.min(1, boxWidth / paper.width) : 1;

  return (
    <div
      ref={boxRef}
      className="w-full overflow-auto rounded-xl border bg-slate-100"
      style={{ maxHeight: 720 }}
    >
      <div className="relative" style={{ height: Math.round(paper.height * scale) }}>
        <iframe
          title="Quotation preview"
          src={src}
          className="absolute top-0 left-0 bg-white"
          style={{
            width: paper.width,
            height: paper.height,
            border: 0,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </div>
  );
};

const naira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const blankLine = () => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  productId: "",
  name: "",
  unit: "pcs",
  quantity: 1,
  unitPrice: "",
});

const emptyCustomer = () => ({
  id: "",
  name: "",
  phone: "",
  email: "",
  code: "",
});

const nextQuoteNo = () => {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `QT-${stamp}-${String(Math.floor(Math.random() * 900) + 100)}`;
};

const asMidday = (value) => {
  const day = String(value || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return `${day}T12:00:00`;
  return new Date().toISOString();
};

const formatQuoteDate = (value) => {
  const day = String(value || "").slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return "";
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "short", year: "numeric" }
  );
};

const lineSignature = (items) =>
  [...(items || [])]
    .map((line, index) => ({
      position: Number(line.position ?? index),
      productId: line.productId || "",
      name: String(line.name || line.description || "").trim(),
      quantity: Number(line.quantity || 0),
      unitPrice: Number(line.unitPrice || 0),
    }))
    .sort((a, b) => a.position - b.position)
    .map((line) => [line.productId, line.name, line.quantity, line.unitPrice].join("|"))
    .join(";");

const stockLeft = (product) => {
  if (!product?.trackInventory) return null;
  const row = Array.isArray(product.inventory) ? product.inventory[0] : null;
  if (!row) return null;
  return parseFloat(row.quantity || 0) - parseFloat(row.reservedQuantity || 0);
};

const QuotationsPage = () => {
  const user = useSelector(selectUser);
  const queryClient = useQueryClient();
  const formRef = useRef(null);
  const { data: settingsData } = useQuery("settings", api.settings.get, {
    staleTime: 0,
    refetchOnMount: "always",
  });
  const { data: productData } = useQuery("quotation-products", () =>
    api.products.list({ status: "active", limit: 100 })
  );
  const { data: customerData } = useQuery("quotation-customers", () =>
    api.customers.list({ limit: 100 })
  );
  const { data: historyData, isLoading: historyLoading } = useQuery("quotations", () =>
    api.quotations.list({ limit: 50 })
  );

  const business = settingsData?.data?.business || null;
  const products = productData?.data?.items || [];
  const customers = customerData?.data?.items || [];
  const history = historyData?.data?.items || [];

  const [quoteNo, setQuoteNo] = useState(nextQuoteNo);
  const [quoteDate, setQuoteDate] = useState(() => new Date().toISOString());
  const [customer, setCustomer] = useState(emptyCustomer);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([blankLine()]);
  const [reduceInventory, setReduceInventory] = useState(false);
  const [loaded, setLoaded] = useState(null);

  const currentStaff =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Staff";

  const pricedLines = lines
    .map((line) => {
      const quantity = Number(line.quantity || 0);
      const unitPrice = Number(line.unitPrice || 0);
      return {
        ...line,
        quantity,
        unitPrice,
        totalPrice: quantity * unitPrice,
      };
    })
    .filter((line) => line.name.trim() && line.quantity > 0);

  const computedSubtotal = pricedLines.reduce((sum, line) => sum + line.totalPrice, 0);
  const taxEnabled = Boolean(business?.taxEnabled);
  const taxRate = Number(business?.taxRate || 0);
  const taxableSubtotal = pricedLines.reduce((sum, line) => {
    if (line.vatStatus !== "Vatable") return sum;
    return sum + line.totalPrice;
  }, 0);
  const computedTax = taxEnabled ? taxableSubtotal * (taxRate / 100) : 0;
  const linesUnchanged = Boolean(loaded) && lineSignature(pricedLines) === lineSignature(loaded.items);
  const subtotal = linesUnchanged ? Number(loaded.subtotal) : computedSubtotal;
  const taxAmount = linesUnchanged ? Number(loaded.taxAmount) : computedTax;
  const total = linesUnchanged ? Number(loaded.total) : subtotal + taxAmount;
  const savedStaff = [loaded?.creator?.firstName, loaded?.creator?.lastName]
    .filter(Boolean)
    .join(" ");
  const staffName = linesUnchanged && savedStaff ? savedStaff : currentStaff;

  const sale = useMemo(
    () => ({
      saleNumber: quoteNo.trim() || "QUOTATION",
      date: quoteDate,
      customer: {
        name: customer.name.trim() || "Customer",
        phone: customer.phone,
        code: customer.code,
      },
      cashierName: staffName,
      notes: notes.trim(),
      subtotal,
      taxAmount,
      discountAmount: 0,
      total,
      paidAmount: 0,
      items: pricedLines.map((line) => ({
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        totalPrice: line.totalPrice,
        product: { name: line.name.trim(), unit: line.unit || "pcs" },
      })),
    }),
    [
      quoteNo,
      quoteDate,
      customer.name,
      customer.phone,
      customer.code,
      staffName,
      notes,
      subtotal,
      taxAmount,
      total,
      pricedLines,
    ]
  );

  const previewSrc = useMemo(() => {
    if (!business) return "";
    return getDocumentPreviewSrc(buildQuotationHtml({ business, sale }));
  }, [business, sale]);

  const message = [
    `Quotation ${sale.saleNumber} from ${business?.name || "our shop"}`,
    "",
    `Customer: ${customer.name.trim() || "Customer"}`,
    "",
    ...pricedLines.map(
      (line, index) =>
        `${index + 1}. ${line.name.trim()} x ${line.quantity} — ${naira(line.totalPrice)}`
    ),
    "",
    `Total: ${naira(total)}`,
    notes.trim(),
  ]
    .filter((line) => line !== "")
    .join("\n");

  const refreshSaved = () => {
    queryClient.invalidateQueries("quotations");
    queryClient.invalidateQueries("quotation-products");
    queryClient.invalidateQueries("quotation-customers");
    queryClient.invalidateQueries("products");
  };

  const startNew = (nextReduce = false) => {
    setQuoteNo(nextQuoteNo());
    setQuoteDate(new Date().toISOString());
    setCustomer(emptyCustomer());
    setNotes("");
    setLines([blankLine()]);
    setLoaded(null);
    setReduceInventory(nextReduce);
  };

  const saveQuotation = useMutation(api.quotations.create, {
    onSuccess: (response) => {
      toast.success(response.message || "Quotation saved");
      refreshSaved();
      startNew(reduceInventory);
    },
  });

  const cancelQuotation = useMutation(api.quotations.cancel, {
    onSuccess: (response, id) => {
      toast.success(response.message || "Quotation cancelled");
      refreshSaved();
      if (loaded?.id === id) startNew(true);
    },
  });

  const updateLine = (key, patch) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line))
    );
  };

  const pickProduct = (key, productId) => {
    const product = products.find((item) => item.id === productId);
    updateLine(key, {
      productId,
      name: product?.name || "",
      unit: product?.unit || "pcs",
      unitPrice: product ? product.sellingPrice : "",
      vatStatus: product?.vatStatus || "Non-Vatable",
    });
  };

  const pickCustomer = (id) => {
    const found = customers.find((item) => item.id === id);
    if (!found) {
      setCustomer((current) => ({ ...current, id: "" }));
      return;
    }
    setCustomer({
      id: found.id,
      name: found.name || "",
      phone: found.phone || "",
      email: found.email || "",
      code: found.code || "",
    });
  };

  const openQuotation = (quotation) => {
    const items = [...(quotation.items || [])].sort(
      (a, b) => Number(a.position || 0) - Number(b.position || 0)
    );
    setLoaded(quotation);
    setQuoteNo(quotation.quotationNumber || "");
    setQuoteDate(asMidday(quotation.date || quotation.createdAt));
    setCustomer({
      id: quotation.customerId || quotation.customer?.id || "",
      name: quotation.customerName || quotation.customer?.name || "",
      phone: quotation.customerPhone || quotation.customer?.phone || "",
      email: quotation.customerEmail || quotation.customer?.email || "",
      code: quotation.customer?.code || "",
    });
    setNotes(quotation.notes || "");
    setLines(
      items.length
        ? items.map((item) => ({
            key: item.id,
            productId: item.productId || "",
            name: item.description || item.product?.name || "",
            unit: item.unit || item.product?.unit || "pcs",
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          }))
        : [blankLine()]
    );
    setReduceInventory(false);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const ready = () => {
    if (!customer.name.trim()) {
      toast.error("Add the customer name");
      return false;
    }
    if (!pricedLines.length) {
      toast.error("Add at least one item");
      return false;
    }
    return true;
  };

  const save = () => {
    if (!ready() || saveQuotation.isLoading) return;
    const number =
      loaded && quoteNo.trim() === loaded.quotationNumber ? nextQuoteNo() : quoteNo.trim();
    saveQuotation.mutate({
      quotationNumber: number,
      customerId: customer.id || undefined,
      customerName: customer.name.trim(),
      customerPhone: customer.phone.trim() || undefined,
      customerEmail: customer.email.trim() || undefined,
      notes: notes.trim() || undefined,
      reduceInventory,
      items: pricedLines.map((line) => ({
        productId: line.productId || undefined,
        description: line.name.trim(),
        unit: line.unit || "pcs",
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
    });
  };

  const cancelOne = (quotation) => {
    if (!quotation || quotation.status !== "open" || cancelQuotation.isLoading) return;
    const prompt = quotation.inventoryReduced
      ? "Cancel this quotation and put the items back in stock?"
      : "Cancel this quotation?";
    if (!window.confirm(prompt)) return;
    cancelQuotation.mutate(quotation.id);
  };

  const sendWhatsApp = () => {
    if (!ready()) return;
    window.open(whatsappLink(customer.phone, message), "_blank", "noopener");
  };

  const sendEmail = () => {
    if (!ready()) return;
    if (!customer.email.trim()) {
      toast.error("Add the customer email");
      return;
    }
    const subject = `Quotation ${sale.saleNumber} from ${business?.name || "our shop"}`;
    window.location.href = `mailto:${customer.email.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  };

  const print = () => {
    if (!ready() || !business) return;
    printQuotation({ business, sale });
  };

  const printSettings = getDocPrintSettings(business, "invoice");

  const qtyForProduct = (productId) =>
    lines.reduce((sum, line) => {
      if (line.productId !== productId) return sum;
      return sum + Number(line.quantity || 0);
    }, 0);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quotations</h1>
        <p className="text-slate-500">
          Save a quotation, keep the history, and take the quoted products out of stock when you need to.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <form
          ref={formRef}
          className="bg-white rounded-2xl border p-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          {loaded && (
            <div className="rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-600 flex items-center justify-between gap-3">
              <span>
                Viewing {loaded.quotationNumber}
                {loaded.status === "cancelled"
                  ? " · Cancelled"
                  : loaded.inventoryReduced
                  ? " · Stock already reduced"
                  : " · Saved"}
              </span>
              <button
                type="button"
                className="font-medium text-teal-700 whitespace-nowrap"
                onClick={() => startNew(true)}
              >
                New quotation
              </button>
            </div>
          )}

          <label className="block space-y-1">
            <span className="text-sm text-slate-600">Quotation number</span>
            <input
              className="w-full border rounded-xl px-3 py-2"
              value={quoteNo}
              onChange={(event) => setQuoteNo(event.target.value)}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm text-slate-600">Saved customer</span>
            <select
              className="w-full border rounded-xl px-3 py-2"
              value={customer.id}
              onChange={(event) => pickCustomer(event.target.value)}
            >
              <option value="">Type a new customer</option>
              {customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.phone ? ` — ${item.phone}` : ""}
                </option>
              ))}
            </select>
          </label>

          <input
            required
            placeholder="Customer name"
            className="w-full border rounded-xl px-3 py-2"
            value={customer.name}
            onChange={(event) =>
              setCustomer({ ...customer, id: "", name: event.target.value })
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              placeholder="WhatsApp number"
              className="w-full border rounded-xl px-3 py-2"
              value={customer.phone}
              onChange={(event) =>
                setCustomer({ ...customer, phone: event.target.value })
              }
            />
            <input
              type="email"
              placeholder="Email"
              className="w-full border rounded-xl px-3 py-2"
              value={customer.email}
              onChange={(event) =>
                setCustomer({ ...customer, email: event.target.value })
              }
            />
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => {
              const product = products.find((item) => item.id === line.productId);
              const available = product ? stockLeft(product) : null;
              const overStock =
                reduceInventory &&
                available != null &&
                qtyForProduct(line.productId) > available + 0.0001;
              return (
                <div key={line.key} className="border rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Item {index + 1}</span>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        className="text-red-600"
                        onClick={() =>
                          setLines((current) =>
                            current.filter((item) => item.key !== line.key)
                          )
                        }
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <select
                    className="w-full border rounded-xl px-3 py-2"
                    value={line.productId}
                    onChange={(event) => pickProduct(line.key, event.target.value)}
                  >
                    <option value="">Select a product, or type a description</option>
                    {products.map((item) => {
                      const left = stockLeft(item);
                      const stockLabel =
                        left == null
                          ? ""
                          : ` · ${left.toLocaleString("en-NG")} ${item.unit || "pcs"} left`;
                      return (
                        <option key={item.id} value={item.id}>
                          {item.name} — {naira(item.sellingPrice)}
                          {stockLabel}
                        </option>
                      );
                    })}
                  </select>
                  <input
                    placeholder="Description"
                    className="w-full border rounded-xl px-3 py-2"
                    value={line.name}
                    onChange={(event) =>
                      updateLine(line.key, { name: event.target.value })
                    }
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Quantity"
                      className="border rounded-xl px-3 py-2"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(line.key, { quantity: event.target.value })
                      }
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Unit price"
                      className="border rounded-xl px-3 py-2"
                      value={line.unitPrice}
                      onChange={(event) =>
                        updateLine(line.key, { unitPrice: event.target.value })
                      }
                    />
                  </div>
                  {overStock && (
                    <p className="text-xs text-amber-700">
                      Only {available.toLocaleString("en-NG")} {product.unit || "pcs"} left in stock.
                    </p>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              className="text-sm font-medium text-teal-700"
              onClick={() => setLines((current) => [...current, blankLine()])}
            >
              Add another item
            </button>
          </div>

          <textarea
            rows={2}
            placeholder="Note, for example valid for 7 days"
            className="w-full border rounded-xl px-3 py-2"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />

          <label className="flex items-start gap-3 rounded-xl border px-3 py-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={reduceInventory}
              onChange={(event) => setReduceInventory(event.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium">Reduce inventory</span>
              <span className="block text-xs text-slate-500">
                {loaded
                  ? "A saved copy can take these products out of stock again. Leave this off to keep stock as it is."
                  : "Tracked products on this quotation come out of stock when you save. Typed descriptions do not."}
              </span>
            </span>
          </label>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Total</span>
            <span className="font-semibold">{naira(total)}</span>
          </div>

          <button
            type="submit"
            disabled={saveQuotation.isLoading}
            className="w-full py-3 rounded-xl bg-teal-600 text-white font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Save size={16} />
            {saveQuotation.isLoading
              ? "Saving…"
              : loaded
              ? "Save a copy"
              : "Save quotation"}
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={print}
              className="py-3 rounded-xl border font-medium inline-flex items-center justify-center gap-2"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              type="button"
              onClick={sendWhatsApp}
              className="py-3 rounded-xl border font-medium inline-flex items-center justify-center gap-2"
            >
              <MessageCircle size={16} />
              WhatsApp
            </button>
            <button
              type="button"
              onClick={sendEmail}
              className="py-3 rounded-xl border font-medium inline-flex items-center justify-center gap-2"
            >
              <Mail size={16} />
              Email
            </button>
          </div>
        </form>

        <div className="bg-white rounded-2xl border p-4 space-y-3">
          <p className="text-sm text-slate-500">
            Quotation preview — same paper, colours, and heading as your invoice.
          </p>
          {previewSrc ? (
            <FittedDocumentPreview
              src={previewSrc}
              paperFormat={printSettings.paperFormat}
              orientation={printSettings.orientation}
            />
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-400">
              Loading business details…
            </div>
          )}
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">History</h2>
          <p className="text-sm text-slate-500">
            Open a saved quotation to print or send it again. Cancel one that reduced stock to put the items back.
          </p>
        </div>

        {historyLoading ? (
          <div className="bg-white rounded-2xl border p-8 text-center text-slate-400">
            Loading quotations…
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-2xl border p-8 text-center text-slate-500">
            Saved quotations appear here.
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((quotation) => {
              const selected = loaded?.id === quotation.id;
              const when = formatQuoteDate(quotation.date || quotation.createdAt);
              return (
                <div
                  key={quotation.id}
                  className={`bg-white rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
                    selected ? "border-teal-600" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => openQuotation(quotation)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{quotation.quotationNumber}</p>
                        <p className="text-sm text-slate-500">
                          {quotation.customerName || quotation.customer?.name || "Customer"}
                          {when ? ` · ${when}` : ""}
                        </p>
                      </div>
                      <p className="font-semibold">{naira(quotation.total)}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span
                        className={`px-2 py-1 rounded-full ${
                          quotation.status === "cancelled"
                            ? "bg-slate-100 text-slate-500"
                            : "bg-teal-50 text-teal-800"
                        }`}
                      >
                        {quotation.status === "cancelled" ? "Cancelled" : "Open"}
                      </span>
                      {quotation.inventoryReduced && (
                        <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                          Stock reduced
                        </span>
                      )}
                      <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                        {quotation.items?.length || 0} items
                      </span>
                    </div>
                  </button>
                  {quotation.status === "open" && (
                    <button
                      type="button"
                      className="px-3 py-2 rounded-xl border text-sm text-red-600 disabled:opacity-60"
                      disabled={cancelQuotation.isLoading}
                      onClick={() => cancelOne(quotation)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default QuotationsPage;
