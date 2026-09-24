import React, { useState, useEffect } from "react";
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Receipt,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  X,
  Calculator,
  Check,
  AlertCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import api from "../../services/api";

const SalesPage = () => {
  const [view, setView] = useState("pos"); // 'pos' or 'history'
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Payment form state
  const [paymentData, setPaymentData] = useState({
    method: "cash",
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

  // Fetch customers
  const { data: customersData } = useQuery(
    ["customers", customerSearch],
    () =>
      api.customers.list({
        search: customerSearch,
        page: 1,
        limit: 20,
      }),
    {
      enabled: showCustomerModal && customerSearch.length >= 2,
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
      onSuccess: (data) => {
        toast.success("Sale completed successfully!");
        setCart([]);
        setSelectedCustomer(null);
        setPaymentData({
          method: "cash",
          amountPaid: "",
          discount: 0,
          notes: "",
        });
        setShowPaymentModal(false);
        queryClient.invalidateQueries("sales-history");
        // Could show receipt modal here
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
  const taxAmount = vatEnabled ? (cartTotal * vatRate) / 100 : 0;
  const finalTotal = cartTotal + taxAmount - (paymentData.discount || 0);
  const change = parseFloat(paymentData.amountPaid || 0) - finalTotal;

  // Add product to cart
  const addToCart = (product) => {
    const existingItem = cart.find((item) => item.productId === product.id);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      const inventory = product.inventory?.[0];
      const available = inventory
        ? parseFloat(inventory.quantity || 0) -
          parseFloat(inventory.reservedQuantity || 0)
        : 0;

      if (product.trackInventory && available <= 0) {
        toast.error("Product out of stock");
        return;
      }

      setCart([
        ...cart,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unit: product.unit,
          price: parseFloat(product.sellingPrice),
          quantity: 1,
          maxQuantity: product.trackInventory ? available : 999,
          image: product.image,
        },
      ]);
    }
    setShowProductModal(false);
  };

  // Update cart item quantity
  const updateCartItem = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(
      cart.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(quantity, item.maxQuantity) }
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
      notes: paymentData.notes,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
    };

    createSaleMutation.mutate(saleData);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
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
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search products..."
                className="form-input pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

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
                      onClick={() => !isOutOfStock && addToCart(product)}
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
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Cart ({cart.length})
              </h3>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="card-body p-0">
              {cart.length === 0 ? (
                <div className="p-6 text-center">
                  <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Cart is empty</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Add products to start a sale
                  </p>
                </div>
              ) : (
                <div className="space-y-0 max-h-96 overflow-y-auto">
                  {cart.map((item) => (
                    <div
                      key={item.productId}
                      className="p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {item.name}
                          </h4>
                          <p className="text-xs text-gray-500">{item.sku}</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="ml-2 p-1 text-red-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() =>
                              updateCartItem(item.productId, item.quantity - 1)
                            }
                            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-medium"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateCartItem(item.productId, item.quantity + 1)
                            }
                            disabled={item.quantity >= item.maxQuantity}
                            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center text-sm font-medium"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(item.quantity * item.price)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(item.price)} each
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="card-footer">
                {/* Customer Section */}
                <div className="mb-4">
                  <button
                    onClick={() => setShowCustomerModal(true)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-left hover:bg-gray-50 flex items-center"
                  >
                    <User className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-sm">
                      {selectedCustomer
                        ? selectedCustomer.name
                        : "Walk-in Customer"}
                    </span>
                  </button>
                </div>

                {/* Total */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(cartTotal)}</span>
                  </div>
                  {vatEnabled && taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>
                        {vatName} ({vatRate}%):
                      </span>
                      <span>{formatCurrency(taxAmount)}</span>
                    </div>
                  )}
                  {paymentData.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount:</span>
                      <span>-{formatCurrency(paymentData.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(finalTotal)}</span>
                  </div>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={() => {
                    setPaymentData({
                      ...paymentData,
                      amountPaid: finalTotal.toFixed(2),
                    });
                    setShowPaymentModal(true);
                  }}
                  className="btn btn-success w-full mobile-btn"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Checkout
                </button>
              </div>
            )}
          </div>
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
                </div>
              </div>
            ))
          )}
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
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        setPaymentData({ ...paymentData, method: "cash" })
                      }
                      className={`p-3 rounded-lg border text-center ${
                        paymentData.method === "cash"
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <Banknote className="w-6 h-6 mx-auto mb-1" />
                      <span className="text-sm font-medium">Cash</span>
                    </button>
                    <button
                      onClick={() =>
                        setPaymentData({ ...paymentData, method: "card" })
                      }
                      className={`p-3 rounded-lg border text-center ${
                        paymentData.method === "card"
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <CreditCard className="w-6 h-6 mx-auto mb-1" />
                      <span className="text-sm font-medium">Card</span>
                    </button>
                  </div>
                </div>

                {/* Amount Paid */}
                <div>
                  <label className="form-label">Amount Paid</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input text-lg font-semibold"
                    value={paymentData.amountPaid}
                    onChange={(e) =>
                      setPaymentData({
                        ...paymentData,
                        amountPaid: e.target.value,
                      })
                    }
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

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {[1000, 2000, 5000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() =>
                        setPaymentData({
                          ...paymentData,
                          amountPaid: amount.toString(),
                        })
                      }
                      className="btn btn-outline btn-sm"
                    >
                      {formatCurrency(amount)}
                    </button>
                  ))}
                </div>

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
                      createSaleMutation.isLoading
                    }
                    className="flex-1 btn btn-success"
                  >
                    {createSaleMutation.isLoading ? (
                      <div className="spinner w-4 h-4 mr-2"></div>
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Complete Sale
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Modal - Placeholder */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Select Customer
                </h3>
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="text-center py-8">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Customer selection coming soon...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPage;
