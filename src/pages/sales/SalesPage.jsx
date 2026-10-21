import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ShoppingCart,
  Plus,
  Minus,
  Search,
  Filter,
  Receipt,
  FileText,
  Truck,
  User,
  CreditCard,
  X,
  Calculator,
  Check,
  AlertCircle,
  ScanBarcode,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import api from "../../services/api";
import { getDocPrintSettings } from "../../utils/salesDocuments";

const parseScanInput = (raw) => {
  const value = String(raw || "").trim();
  if (!value) return { qty: 1, code: "" };

  // Supermarket style: 4*BARCODE or 4xBARCODE
  const multiply = value.match(/^(\d+(?:\.\d+)?)\s*[xX*]\s*(.+)$/);
  if (multiply) {
    return {
      qty: Math.max(0.001, parseFloat(multiply[1]) || 1),
      code: multiply[2].trim(),
    };
  }

  return { qty: 1, code: value };
};

const SalesPage = () => {
  const [view, setView] = useState("pos"); // 'pos' or 'history'
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [scanQty, setScanQty] = useState("1");
  const [isScanning, setIsScanning] = useState(false);
  const scanInputRef = useRef(null);
  const scanQtyRef = useRef(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: "",
    phone: "",
  });
  const customerSearchRef = useRef(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);

  // Payment form state
  const [paymentData, setPaymentData] = useState({
    method: "cash",
    bankAccountId: "",
    amountPaid: "",
    discount: 0,
    notes: "",
  });

  const queryClient = useQueryClient();

  const { data: settingsData } = useQuery("settings", api.settings.get, {
    refetchOnWindowFocus: false,
  });
  const vatEnabled = Boolean(settingsData?.data?.business?.taxEnabled);
  const vatRate = parseFloat(settingsData?.data?.business?.taxRate || 0);
  const vatName = settingsData?.data?.business?.taxName || "VAT";
  const bankAccounts =
    settingsData?.data?.bankAccounts ||
    settingsData?.data?.business?.bankAccounts ||
    [];
  const defaultPaymentMethod =
    settingsData?.data?.pos?.defaultPaymentMethod === "bank" ? "bank" : "cash";
  const defaultBankAccountId = (() => {
    const preferred = settingsData?.data?.pos?.defaultBankAccountId;
    if (preferred && bankAccounts.some((b) => b.id === preferred)) {
      return preferred;
    }
    const businessDefault = bankAccounts.find((b) => b.isDefault);
    return businessDefault?.id || bankAccounts[0]?.id || "";
  })();

  useEffect(() => {
    setPaymentData((prev) => ({
      ...prev,
      method: defaultPaymentMethod,
      bankAccountId: defaultBankAccountId,
    }));
  }, [defaultPaymentMethod, defaultBankAccountId]);

  // Fetch products for POS
  const { data: productsData, isLoading: productsLoading } = useQuery(
    ["products", search],
    () =>
      api.products.list({
        search,
        status: "active",
        page: 1,
        limit: 50,
      }),
    {
      enabled: view === "pos",
    }
  );

  // Fetch customers for POS picker
  const {
    data: customersData,
    isLoading: customersLoading,
    isFetching: customersFetching,
  } = useQuery(
    ["pos-customers", customerSearch],
    () =>
      api.customers.list({
        search: customerSearch.trim() || undefined,
        page: 1,
        limit: 30,
        sortBy: "name",
        sortOrder: "asc",
      }),
    {
      enabled: showCustomerModal,
      keepPreviousData: true,
    }
  );

  const createCustomerMutation = useMutation(
    (payload) => api.customers.create(payload),
    {
      onSuccess: (response) => {
        const customer = response?.data?.customer || response?.data;
        if (customer?.id) {
          setSelectedCustomer(customer);
          setShowCustomerModal(false);
          setCustomerSearch("");
          setNewCustomerForm({ name: "", phone: "" });
          setShowNewCustomer(false);
          toast.success(`Customer ${customer.name} selected`);
        }
        queryClient.invalidateQueries("pos-customers");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create customer");
      },
    }
  );

  // Fetch sales history
  const { data: salesData, isLoading: salesLoading } = useQuery(
    "sales-history",
    () =>
      api.sales.list({
        page: 1,
        limit: 20,
        sortBy: "date",
        sortOrder: "desc",
      }),
    {
      enabled: view === "history",
    }
  );

  // Create sale mutation
  const createSaleMutation = useMutation(
    (saleData) => api.sales.create(saleData),
    {
      onSuccess: (response) => {
        toast.success("Sale completed successfully!");
        const sale = response?.data?.sale || null;
        setCompletedSale(sale);
        const receipt = settingsData?.data?.business?.receiptSettings || {};
        const canPrintInvoice = receipt.includeInvoice !== false;
        const canPrintWaybill = receipt.includeWaybill !== false;
        if (sale && (canPrintInvoice || canPrintWaybill)) {
          setShowPrintModal(true);
        }
        setCart([]);
        setSelectedCustomer(null);
        setPaymentData({
          method: defaultPaymentMethod,
          amountPaid: "",
          discount: 0,
          notes: "",
        });
        setShowPaymentModal(false);
        queryClient.invalidateQueries("sales-history");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to process sale");
      },
    }
  );

  const products = productsData?.data?.items || [];
  const customers = customersData?.data?.items || [];
  const sales = salesData?.data?.items || [];

  // Cart calculations
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
  const cartUnitCount = cart.reduce(
    (sum, item) => sum + (parseFloat(item.quantity) || 0),
    0
  );
  const taxAmount = vatEnabled ? (cartTotal * vatRate) / 100 : 0;
  const finalTotal = cartTotal + taxAmount - (paymentData.discount || 0);
  const change = parseFloat(paymentData.amountPaid || 0) - finalTotal;

  const focusScanInput = useCallback(() => {
    if (view !== "pos") return;
    window.requestAnimationFrame(() => {
      scanInputRef.current?.focus();
      scanInputRef.current?.select();
    });
  }, [view]);

  useEffect(() => {
    if (view === "pos" && !showPaymentModal && !showCustomerModal) {
      focusScanInput();
    }
  }, [view, showPaymentModal, showCustomerModal, focusScanInput]);

  // Add product to cart (qty = supermarket quantity for this scan/tap)
  const addToCart = useCallback(
    (product, qty = 1) => {
      const addQty = Math.max(0.001, parseFloat(qty) || 1);
      const inventory = product.inventory?.[0];
      const available = inventory
        ? parseFloat(inventory.quantity || 0) -
          parseFloat(inventory.reservedQuantity || 0)
        : 999;

      if (product.trackInventory && available <= 0) {
        toast.error("Product out of stock");
        return false;
      }

      setCart((prev) => {
        const existingItem = prev.find((item) => item.productId === product.id);
        if (existingItem) {
          const nextQty = existingItem.quantity + addQty;
          if (product.trackInventory && nextQty > available) {
            toast.error(`Only ${available} ${product.unit || "pcs"} available`);
            return prev.map((item) =>
              item.productId === product.id
                ? { ...item, quantity: available, maxQuantity: available }
                : item
            );
          }
          return prev.map((item) =>
            item.productId === product.id
              ? {
                  ...item,
                  quantity: nextQty,
                  maxQuantity: product.trackInventory ? available : 999999,
                }
              : item
          );
        }

        if (product.trackInventory && addQty > available) {
          toast.error(`Only ${available} ${product.unit || "pcs"} available`);
          return [
            ...prev,
            {
              productId: product.id,
              name: product.name,
              sku: product.sku,
              barcode: product.barcode,
              unit: product.unit,
              price: parseFloat(product.sellingPrice),
              quantity: available,
              maxQuantity: available,
              image: product.image,
            },
          ];
        }

        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            unit: product.unit,
            price: parseFloat(product.sellingPrice),
            quantity: addQty,
            maxQuantity: product.trackInventory ? available : 999999,
            image: product.image,
          },
        ];
      });

      setShowProductModal(false);
      return true;
    },
    []
  );

  const lookupProductByCode = async (code) => {
    const response = await api.products.list({
      search: code,
      status: "active",
      page: 1,
      limit: 20,
    });
    const items = response?.data?.items || [];
    const normalized = code.toLowerCase();
    return (
      items.find(
        (p) =>
          String(p.barcode || "").toLowerCase() === normalized ||
          String(p.sku || "").toLowerCase() === normalized
      ) ||
      items.find(
        (p) =>
          String(p.barcode || "").toLowerCase().includes(normalized) ||
          String(p.sku || "").toLowerCase().includes(normalized)
      ) ||
      (items.length === 1 ? items[0] : null)
    );
  };

  const handleScanSubmit = async (event) => {
    event?.preventDefault?.();
    const raw = scanValue.trim();
    if (!raw || isScanning) return;

    const parsed = parseScanInput(raw);
    const qtyFromField = Math.max(0.001, parseFloat(scanQty) || 1);
    const qty =
      parsed.code !== raw || /[xX*]/.test(raw) ? parsed.qty : qtyFromField;
    const code = parsed.code;

    if (!code) {
      toast.error("Scan a barcode or enter a SKU");
      return;
    }

    setIsScanning(true);
    try {
      const product = await lookupProductByCode(code);
      if (!product) {
        toast.error(`No product found for "${code}"`);
        focusScanInput();
        return;
      }

      const added = addToCart(product, qty);
      if (added) {
        setScanValue("");
        setScanQty("1");
        setSearch("");
        toast.success(`Added ${qty} × ${product.name}`, { id: "pos-scan" });
      }
      focusScanInput();
    } catch (error) {
      toast.error(error.message || "Could not look up product");
      focusScanInput();
    } finally {
      setIsScanning(false);
    }
  };

  // Update cart item quantity
  const updateCartItem = (productId, quantity) => {
    const next = parseFloat(quantity);
    if (!Number.isFinite(next) || next <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: Math.min(next, item.maxQuantity || next),
            }
          : item
      )
    );
  };

  // Remove item from cart
  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
  };

  // Process payment
  const processPayment = () => {
    if (cart.length === 0) {
      toast.error("Add items to cart first");
      return;
    }

    if (parseFloat(paymentData.amountPaid || 0) < finalTotal) {
      toast.error("Insufficient payment amount");
      return;
    }

    let notes = paymentData.notes || "";
    if (paymentData.method === "bank") {
      if (bankAccounts.length === 0) {
        toast.error("Add a bank account in Settings before taking bank payments");
        return;
      }
      const bank =
        bankAccounts.find((item) => item.id === paymentData.bankAccountId) ||
        null;
      if (!bank) {
        toast.error("Select a bank account for this sale");
        return;
      }
      const bankNote = `Bank: ${bank.bankName} · ${bank.accountName} · ${bank.accountNumber}`;
      notes = notes ? `${notes}\n${bankNote}` : bankNote;
    }

    const saleData = {
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
      paymentMethod: paymentData.method,
      paidAmount: parseFloat(paymentData.amountPaid),
      discountAmount: parseFloat(paymentData.discount || 0),
      taxRate: vatEnabled ? vatRate : 0,
      notes,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
    };

    createSaleMutation.mutate(saleData);
  };

  const businessSettings = settingsData?.data?.business || {};
  const receiptSettings = businessSettings.receiptSettings || {};
  const invoicePrint = getDocPrintSettings(businessSettings, "invoice");
  const waybillPrint = getDocPrintSettings(businessSettings, "waybill");
  const invoicePaperLabel =
    {
      a4: "A4 Standard",
      a5: "A5",
      a6: "A6",
      thermal: "Thermal",
    }[invoicePrint.paperFormat] || "A4 Standard";
  const waybillPaperLabel =
    {
      a4: "A4 Standard",
      a5: "A5",
      a6: "A6",
      thermal: "Thermal GIN",
    }[waybillPrint.paperFormat] || "Waybill";
  const invoiceEnabled = receiptSettings.includeInvoice !== false;
  const waybillEnabled = receiptSettings.includeWaybill !== false;
  const printDocsEnabled = invoiceEnabled || waybillEnabled;
  const waybillActionLabel =
    waybillPrint.paperFormat === "thermal"
      ? "Print goods issue note"
      : "Print waybill";

  const printSaleInvoice = async (sale, { openAsPage = false } = {}) => {
    if (!invoiceEnabled) return;
    const { printSalesInvoice } = await import("../../utils/salesDocuments");
    printSalesInvoice({
      business: businessSettings,
      sale,
      format: invoicePrint.paperFormat,
      orientation: invoicePrint.orientation,
      colorMode: invoicePrint.colorMode,
      openAsPage,
    });
  };

  const printSaleWaybill = async (sale, { openAsPage = false } = {}) => {
    if (!waybillEnabled) return;
    const { printSalesWaybill } = await import("../../utils/salesDocuments");
    printSalesWaybill({
      business: businessSettings,
      sale,
      format: waybillPrint.paperFormat,
      orientation: waybillPrint.orientation,
      colorMode: waybillPrint.colorMode,
      openAsPage,
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const parseAmountInput = (raw) => {
    const cleaned = String(raw ?? "")
      .replace(/,/g, "")
      .replace(/[^\d.]/g, "");
    if (!cleaned) return "";
    const [whole, ...rest] = cleaned.split(".");
    if (rest.length === 0) return whole;
    return `${whole}.${rest.join("").slice(0, 2)}`;
  };

  const formatAmountInput = (value) => {
    if (value === "" || value == null) return "";
    const raw = String(value);
    const endsWithDot = raw.endsWith(".");
    const [whole, fraction] = raw.split(".");
    const formattedWhole = (whole || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (endsWithDot && fraction === undefined) return `${formattedWhole}.`;
    if (fraction !== undefined) return `${formattedWhole}.${fraction.slice(0, 2)}`;
    return formattedWhole;
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Sales
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {view === "pos" ? "Point of Sale" : "Sales History"}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setView("pos")}
              className={`px-4 py-2 rounded-l-lg text-sm font-medium transition-colors ${
                view === "pos"
                  ? "bg-primary-100 text-primary-600 border-primary-300"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <ShoppingCart className="w-4 h-4 mr-2 inline" />
              POS
            </button>
            <button
              onClick={() => setView("history")}
              className={`px-4 py-2 rounded-r-lg text-sm font-medium transition-colors ${
                view === "history"
                  ? "bg-primary-100 text-primary-600 border-primary-300"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Receipt className="w-4 h-4 mr-2 inline" />
              History
            </button>
          </div>
        </div>
      </div>

      {/* POS Interface */}
      {view === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Grid */}
          <div className="lg:col-span-2 space-y-4">
            {/* Scan + search (supermarket style) */}
            <form
              onSubmit={handleScanSubmit}
              className="flex flex-col sm:flex-row gap-2"
            >
              <div className="flex items-stretch rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
                <label
                  htmlFor="pos-qty"
                  className="flex items-center px-3 text-xs font-semibold text-gray-500 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700"
                >
                  Qty
                </label>
                <input
                  id="pos-qty"
                  ref={scanQtyRef}
                  type="number"
                  min="0.001"
                  step="any"
                  inputMode="decimal"
                  className="w-20 sm:w-24 px-2 py-2.5 text-center text-lg font-semibold bg-transparent border-0 focus:ring-0 outline-none"
                  value={scanQty}
                  onChange={(e) => setScanQty(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      scanInputRef.current?.focus();
                    }
                  }}
                  aria-label="Quantity to add"
                />
              </div>

              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ScanBarcode className="h-5 w-5 text-primary-500" />
                </div>
                <input
                  ref={scanInputRef}
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Scan barcode, SKU, or type 4*CODE then Enter..."
                  className="form-input pl-10 pr-24"
                  value={scanValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    setScanValue(value);
                    // Live filter grid while typing (not during rapid scanner bursts)
                    setSearch(value.replace(/^(\d+(?:\.\d+)?)\s*[xX*]\s*/, ""));
                  }}
                  onKeyDown={(e) => {
                    // Scanners send Enter after the barcode
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleScanSubmit(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={isScanning || !scanValue.trim()}
                  className="absolute inset-y-1 right-1 px-3 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                >
                  {isScanning ? "..." : "Add"}
                </button>
              </div>
            </form>
            <p className="text-xs text-gray-500 -mt-2">
              Tip: set Qty then scan, or type{" "}
              <span className="font-mono">3*barcode</span> and press Enter.
            </p>

            {/* Products Grid */}
            {productsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="card p-4 animate-pulse">
                    <div className="w-full h-20 bg-gray-200 rounded mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {products.map((product) => {
                  const inventory = product.inventory?.[0];
                  const available = inventory
                    ? parseFloat(inventory.quantity || 0) -
                      parseFloat(inventory.reservedQuantity || 0)
                    : 0;
                  const isOutOfStock = product.trackInventory && available <= 0;

                  return (
                    <div
                      key={product.id}
                      onClick={() => {
                        if (isOutOfStock) return;
                        const qty = Math.max(0.001, parseFloat(scanQty) || 1);
                        if (addToCart(product, qty)) {
                          setScanQty("1");
                          focusScanInput();
                        }
                      }}
                      className={`card p-3 cursor-pointer transition-all hover:shadow-md mobile-btn ${
                        isOutOfStock
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-primary-50"
                      }`}
                    >
                      {/* Product Image */}
                      <div className="w-full h-16 bg-gray-100 rounded mb-2 flex items-center justify-center">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <ShoppingCart className="w-5 h-5 text-gray-400" />
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="space-y-1">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {product.name}
                        </h4>
                        <p className="text-xs text-gray-500 font-mono">
                          {product.sku}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-primary-600">
                            {formatCurrency(product.sellingPrice)}
                          </p>
                          {product.trackInventory && (
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                available > 10
                                  ? "bg-green-100 text-green-800"
                                  : available > 0
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {available}
                            </span>
                          )}
                        </div>
                      </div>

                      {isOutOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-90 rounded">
                          <span className="text-xs font-medium text-red-600">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart Sidebar */}
          <aside className="lg:sticky lg:top-4 self-start">
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:bg-gray-900 dark:border-gray-700 overflow-hidden flex flex-col max-h-[calc(100vh-6rem)]">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-gray-800 bg-slate-50/80 dark:bg-gray-800/50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">
                      Cart
                    </h3>
                    <p className="text-xs text-slate-500 truncate">
                      {cart.length === 0
                        ? "No items yet"
                        : `${cart.length} line${cart.length === 1 ? "" : "s"} · ${
                            Number.isInteger(cartUnitCount)
                              ? cartUnitCount
                              : cartUnitCount.toFixed(2)
                          } unit${cartUnitCount === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </button>
                )}
              </div>

              {/* Line items */}
              <div className="flex-1 overflow-y-auto min-h-[10rem]">
                {cart.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-gray-800">
                      <ShoppingCart className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Cart is empty
                    </p>
                    <p className="mt-1 text-xs text-slate-400 max-w-[14rem] mx-auto leading-relaxed">
                      Scan a barcode or tap a product to start this sale
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-gray-800">
                    {cart.map((item) => (
                      <li key={item.productId} className="px-4 py-3.5">
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                              {item.name}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {formatCurrency(item.price)}
                              {item.sku ? ` · ${item.sku}` : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.productId)}
                            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 transition-colors"
                            aria-label={`Remove ${item.name}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-800 overflow-hidden">
                            <button
                              type="button"
                              onClick={() =>
                                updateCartItem(
                                  item.productId,
                                  item.quantity - 1
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center text-slate-600 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <input
                              type="number"
                              min="0.001"
                              step="any"
                              inputMode="decimal"
                              className="h-9 w-14 border-x border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-center text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500"
                              value={item.quantity}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "" || value === ".") return;
                                updateCartItem(item.productId, value);
                              }}
                              onBlur={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!Number.isFinite(value) || value <= 0) {
                                  updateCartItem(item.productId, 1);
                                }
                              }}
                              aria-label={`Quantity for ${item.name}`}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateCartItem(
                                  item.productId,
                                  item.quantity + 1
                                )
                              }
                              disabled={item.quantity >= item.maxQuantity}
                              className="flex h-9 w-9 items-center justify-center text-slate-600 hover:bg-slate-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                            {formatCurrency(item.quantity * item.price)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Footer — always visible */}
              <div className="border-t border-slate-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 pt-3 pb-4 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerSearch("");
                    setShowNewCustomer(false);
                    setShowCustomerModal(true);
                  }}
                  className="w-full flex items-center gap-3 rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50/80 dark:bg-gray-800 px-3 py-2.5 text-left hover:border-teal-300 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 transition-colors"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      selectedCustomer
                        ? "bg-teal-600 text-white"
                        : "bg-slate-200 text-slate-500 dark:bg-gray-700"
                    }`}
                  >
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {selectedCustomer
                        ? selectedCustomer.name
                        : "Walk-in Customer"}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {selectedCustomer?.phone || "Tap to select customer"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </button>

                <div className="rounded-xl bg-slate-50 dark:bg-gray-800/80 px-3.5 py-3 space-y-1.5">
                  <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span>Subtotal</span>
                    <span className="tabular-nums font-medium text-slate-800 dark:text-slate-100">
                      {formatCurrency(cartTotal)}
                    </span>
                  </div>
                  {vatEnabled && taxAmount > 0 && (
                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                      <span>
                        {vatName} ({vatRate}%)
                      </span>
                      <span className="tabular-nums font-medium text-slate-800 dark:text-slate-100">
                        {formatCurrency(taxAmount)}
                      </span>
                    </div>
                  )}
                  {paymentData.discount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Discount</span>
                      <span className="tabular-nums font-medium">
                        −{formatCurrency(paymentData.discount)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-end justify-between gap-2 border-t border-slate-200/80 dark:border-gray-700 pt-2.5 mt-1">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Total
                    </span>
                    <span className="text-xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
                      {formatCurrency(finalTotal)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={() => {
                    setPaymentData({
                      ...paymentData,
                      method: defaultPaymentMethod,
                      bankAccountId: defaultBankAccountId,
                      amountPaid: finalTotal.toFixed(2),
                    });
                    setShowPaymentModal(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm shadow-teal-600/25 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none transition-colors"
                >
                  <CreditCard className="h-4 w-4" />
                  {cart.length === 0
                    ? "Add items to checkout"
                    : `Checkout · ${formatCurrency(finalTotal)}`}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Sales History */}
      {view === "history" && (
        <div className="space-y-4">
          {salesLoading ? (
            <div className="text-center py-12">
              <div className="spinner w-8 h-8 mx-auto"></div>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No sales found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Sales will appear here once you make your first sale
              </p>
            </div>
          ) : (
            sales.map((sale) => (
              <div key={sale.id} className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {sale.saleNumber}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(sale.date).toLocaleDateString()} •{" "}
                        {sale.creator?.firstName} {sale.creator?.lastName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(sale.total)}
                      </p>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          sale.paymentStatus === "paid"
                            ? "bg-green-100 text-green-800"
                            : sale.paymentStatus === "partial"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {sale.paymentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Customer</p>
                      <p className="font-medium">
                        {sale.customer?.name || "Walk-in"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Items</p>
                      <p className="font-medium">{sale.items?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Payment</p>
                      <p className="font-medium capitalize">
                        {sale.paymentMethod}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className="font-medium capitalize">{sale.status}</p>
                    </div>
                  </div>
                  {printDocsEnabled && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {invoiceEnabled && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => printSaleInvoice(sale)}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Print invoice
                        </button>
                      )}
                      {waybillEnabled && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => printSaleWaybill(sale)}
                        >
                          <Truck className="w-4 h-4 mr-1" />
                          {waybillActionLabel}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showPrintModal && completedSale && printDocsEnabled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Print documents
                </h3>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-1">
                {completedSale.saleNumber} · {formatCurrency(completedSale.total)}
              </p>
              <p className="text-xs text-gray-500 mb-4">
                {[
                  invoiceEnabled ? `Invoice: ${invoicePaperLabel}` : null,
                  waybillEnabled ? `Waybill: ${waybillPaperLabel}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                . Each document uses its own settings.
              </p>
              {invoiceEnabled && (
                <button
                  type="button"
                  className="btn btn-outline w-full"
                  onClick={() => printSaleInvoice(completedSale)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Print invoice
                </button>
              )}
              {waybillEnabled && (
                <button
                  type="button"
                  className={`btn btn-outline w-full ${
                    invoiceEnabled ? "mt-2" : ""
                  }`}
                  onClick={() => printSaleWaybill(completedSale)}
                >
                  <Truck className="w-4 h-4 mr-2" />
                  {waybillActionLabel}
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary w-full mt-3"
                onClick={async () => {
                  setShowPrintModal(false);
                  if (invoiceEnabled) {
                    await printSaleInvoice(completedSale, { openAsPage: true });
                  } else if (waybillEnabled) {
                    await printSaleWaybill(completedSale, { openAsPage: true });
                  }
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Payment
                </h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Total */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(cartTotal)}</span>
                  </div>
                  {vatEnabled && (
                    <div className="flex justify-between text-sm">
                      <span>
                        {vatName} ({vatRate}%)
                      </span>
                      <span>{formatCurrency(taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(finalTotal)}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="form-label">Payment Method</label>
                  <select
                    className="form-select"
                    value={paymentData.method}
                    onChange={(e) =>
                      setPaymentData({
                        ...paymentData,
                        method: e.target.value,
                        bankAccountId:
                          e.target.value === "bank"
                            ? paymentData.bankAccountId || defaultBankAccountId
                            : paymentData.bankAccountId,
                      })
                    }
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                  </select>
                </div>

                {paymentData.method === "bank" && (
                  <div>
                    <label className="form-label">Bank Account</label>
                    {bankAccounts.length === 0 ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                        No bank accounts set up. Add one under{" "}
                        <span className="font-semibold">Settings → Business</span>{" "}
                        before completing a bank sale.
                      </div>
                    ) : (
                      <>
                        <select
                          className="form-select"
                          value={paymentData.bankAccountId || ""}
                          onChange={(e) =>
                            setPaymentData({
                              ...paymentData,
                              bankAccountId: e.target.value,
                            })
                          }
                        >
                          <option value="">Select bank account</option>
                          {bankAccounts.map((bank) => (
                            <option key={bank.id} value={bank.id}>
                              {bank.bankName} · {bank.accountNumber}
                              {bank.isDefault ? " (default)" : ""}
                            </option>
                          ))}
                        </select>
                        {(() => {
                          const selected = bankAccounts.find(
                            (b) => b.id === paymentData.bankAccountId
                          );
                          if (!selected) return null;
                          return (
                            <p className="mt-2 text-xs text-slate-500">
                              {selected.accountName} · {selected.accountNumber}
                            </p>
                          );
                        })()}
                      </>
                    )}
                  </div>
                )}

                {/* Amount Paid */}
                <div>
                  <label className="form-label">Amount Paid</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    className="form-input text-lg font-semibold tabular-nums"
                    value={formatAmountInput(paymentData.amountPaid)}
                    onChange={(e) =>
                      setPaymentData({
                        ...paymentData,
                        amountPaid: parseAmountInput(e.target.value),
                      })
                    }
                    onBlur={() => {
                      const amount = parseFloat(paymentData.amountPaid);
                      if (!Number.isFinite(amount)) return;
                      setPaymentData({
                        ...paymentData,
                        amountPaid: amount.toFixed(2),
                      });
                    }}
                    placeholder="0.00"
                  />
                </div>

                {/* Change */}
                {parseFloat(paymentData.amountPaid || 0) > finalTotal && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <div className="flex justify-between text-green-800 dark:text-green-200">
                      <span className="font-medium">Change:</span>
                      <span className="font-bold">
                        {formatCurrency(change)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Process Payment */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={processPayment}
                    disabled={
                      parseFloat(paymentData.amountPaid || 0) < finalTotal ||
                      createSaleMutation.isLoading ||
                      (paymentData.method === "bank" &&
                        (bankAccounts.length === 0 ||
                          !paymentData.bankAccountId))
                    }
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-600/25 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none transition-colors"
                  >
                    {createSaleMutation.isLoading ? (
                      <div className="spinner w-4 h-4"></div>
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Complete Sale
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Select Customer
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomerModal(false);
                    setShowNewCustomer(false);
                    setCustomerSearch("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={customerSearchRef}
                  type="text"
                  autoFocus
                  placeholder="Search name, phone, or email..."
                  className="form-input pl-9"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="px-5 py-2 border-b border-gray-100 dark:border-gray-700 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setShowCustomerModal(false);
                  setCustomerSearch("");
                  toast.success("Walk-in customer");
                }}
                className={`flex-1 text-sm py-2 px-3 rounded-lg border ${
                  !selectedCustomer
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                }`}
              >
                Walk-in
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewCustomer((v) => !v);
                  setNewCustomerForm({
                    name: customerSearch.trim(),
                    phone: "",
                  });
                }}
                className="flex-1 text-sm py-2 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
                New
              </button>
            </div>

            {showNewCustomer && (
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 space-y-2 bg-gray-50 dark:bg-gray-900/40">
                <input
                  type="text"
                  placeholder="Customer name *"
                  className="form-input"
                  value={newCustomerForm.name}
                  onChange={(e) =>
                    setNewCustomerForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  className="form-input"
                  value={newCustomerForm.phone}
                  onChange={(e) =>
                    setNewCustomerForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
                <button
                  type="button"
                  disabled={
                    !newCustomerForm.name.trim() ||
                    createCustomerMutation.isLoading
                  }
                  onClick={() => {
                    const name = newCustomerForm.name.trim();
                    if (!name) {
                      toast.error("Name is required");
                      return;
                    }
                    createCustomerMutation.mutate({
                      name,
                      phone: newCustomerForm.phone.trim() || undefined,
                    });
                  }}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {createCustomerMutation.isLoading
                    ? "Saving..."
                    : "Save & select"}
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto min-h-0">
              {customersLoading || customersFetching ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  Loading customers...
                </div>
              ) : customers.length === 0 ? (
                <div className="p-8 text-center">
                  <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {customerSearch.trim()
                      ? "No customers match your search"
                      : "No customers yet — create one above"}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {customers.map((customer) => {
                    const isSelected = selectedCustomer?.id === customer.id;
                    return (
                      <li key={customer.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowCustomerModal(false);
                            setCustomerSearch("");
                            setShowNewCustomer(false);
                            toast.success(`Customer: ${customer.name}`);
                          }}
                          className={`w-full text-left px-5 py-3 hover:bg-primary-50 dark:hover:bg-gray-700 flex items-center justify-between gap-3 ${
                            isSelected ? "bg-primary-50 dark:bg-primary-900/20" : ""
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {customer.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {[customer.phone, customer.email]
                                .filter(Boolean)
                                .join(" · ") || "No contact info"}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary-600 shrink-0" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPage;
