import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Package,
  DollarSign,
  Eye,
  Edit3,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Minus,
  X,
  Save,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import api from "../../services/api";

const PurchasesPage = () => {
  const [view, setView] = useState("list"); // 'list' or 'new'
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  // New purchase form state
  const [purchaseForm, setPurchaseForm] = useState({
    supplierId: "",
    supplierName: "",
    date: new Date().toISOString().split("T")[0],
    reference: "",
    paymentMethod: "cash",
    paymentStatus: "paid",
    items: [],
    discount: 0,
    tax: 0,
    notes: "",
  });

  const [productSearch, setProductSearch] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch purchases
  const {
    data: purchasesData,
    isLoading: purchasesLoading,
    refetch: refetchPurchases,
  } = useQuery(
    ["purchases", { search, statusFilter, dateFilter }],
    () =>
      api.purchases.list({
        search,
        status: statusFilter === "all" ? undefined : statusFilter,
        dateFrom: dateFilter || undefined,
        page: 1,
        limit: 50,
      }),
    {
      refetchOnWindowFocus: false,
    }
  );

  // Fetch suppliers
  const { data: suppliersData } = useQuery(
    "suppliers",
    () => api.suppliers.list({ page: 1, limit: 100 }),
    {
      refetchOnWindowFocus: false,
    }
  );

  // Fetch products for purchase
  const { data: productsData } = useQuery(
    ["products", productSearch],
    () =>
      api.products.list({
        search: productSearch,
        status: "active",
        page: 1,
        limit: 50,
      }),
    {
      enabled: showProductModal && productSearch.length >= 2,
    }
  );

  // Create purchase mutation
  const createPurchaseMutation = useMutation(api.purchases.create, {
    onSuccess: (data) => {
      toast.success("Purchase recorded successfully!");
      resetForm();
      setView("list");
      queryClient.invalidateQueries("purchases");
      queryClient.invalidateQueries("inventory");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to record purchase");
    },
  });

  const purchases = purchasesData?.data?.items || [];
  const suppliers = suppliersData?.data?.items || [];
  const products = productsData?.data?.items || [];

  // Calculate totals
  const subtotal = purchaseForm.items.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0
  );
  const total = subtotal + purchaseForm.tax - purchaseForm.discount;

  const resetForm = () => {
    setPurchaseForm({
      supplierId: "",
      supplierName: "",
      date: new Date().toISOString().split("T")[0],
      reference: "",
      paymentMethod: "cash",
      paymentStatus: "paid",
      items: [],
      discount: 0,
      tax: 0,
      notes: "",
    });
  };

  const addProductToPurchase = (product) => {
    const existingItem = purchaseForm.items.find(
      (item) => item.productId === product.id
    );

    if (existingItem) {
      setPurchaseForm({
        ...purchaseForm,
        items: purchaseForm.items.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      });
    } else {
      setPurchaseForm({
        ...purchaseForm,
        items: [
          ...purchaseForm.items,
          {
            productId: product.id,
            name: product.name,
            sku: product.sku,
            unit: product.unit,
            quantity: 1,
            unitCost: parseFloat(product.costPrice) || 0,
          },
        ],
      });
    }
    setShowProductModal(false);
  };

  const updatePurchaseItem = (productId, field, value) => {
    setPurchaseForm({
      ...purchaseForm,
      items: purchaseForm.items.map((item) =>
        item.productId === productId ? { ...item, [field]: value } : item
      ),
    });
  };

  const removeFromPurchase = (productId) => {
    setPurchaseForm({
      ...purchaseForm,
      items: purchaseForm.items.filter((item) => item.productId !== productId),
    });
  };

  const submitPurchase = () => {
    if (purchaseForm.items.length === 0) {
      toast.error("Add products to the purchase");
      return;
    }

    if (!purchaseForm.supplierId && !purchaseForm.supplierName.trim()) {
      toast.error("Select or enter supplier name");
      return;
    }

    createPurchaseMutation.mutate(purchaseForm);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Purchase Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {view === "list"
              ? "Purchase history and tracking"
              : "Record new purchase"}
          </p>
        </div>

        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setView("list")}
              className={`px-4 py-2 rounded-l-lg text-sm font-medium transition-colors ${
                view === "list"
                  ? "bg-primary-100 text-primary-600 border-primary-300"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <ShoppingBag className="w-4 h-4 mr-2 inline" />
              Purchases
            </button>
            <button
              onClick={() => setView("new")}
              className={`px-4 py-2 rounded-r-lg text-sm font-medium transition-colors ${
                view === "new"
                  ? "bg-primary-100 text-primary-600 border-primary-300"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Plus className="w-4 h-4 mr-2 inline" />
              New Purchase
            </button>
          </div>
        </div>
      </div>

      {/* Purchase List */}
      {view === "list" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="card p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Reference, supplier..."
                    className="form-input pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setDateFilter("");
                  }}
                  className="btn btn-outline w-full"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Purchases List */}
          {purchasesLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading purchases...</p>
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                No purchases found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {search || statusFilter !== "all" || dateFilter
                  ? "Try adjusting your search or filters"
                  : "Get started by recording your first purchase"}
              </p>
              <button
                onClick={() => setView("new")}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Record Purchase
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {purchases.map((purchase) => (
                <div key={purchase.id} className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {purchase.reference}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(purchase.date).toLocaleDateString()} •{" "}
                          {purchase.supplier?.name || "Unknown Supplier"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900 dark:text-white">
                          {formatCurrency(purchase.totalAmount)}
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            purchase.paymentStatus
                          )}`}
                        >
                          {purchase.paymentStatus === "paid" && (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          )}
                          {purchase.paymentStatus === "pending" && (
                            <Clock className="w-3 h-3 mr-1" />
                          )}
                          {purchase.paymentStatus === "overdue" && (
                            <AlertTriangle className="w-3 h-3 mr-1" />
                          )}
                          {purchase.paymentStatus}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPurchase(purchase);
                          setShowPurchaseModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Purchase items summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-gray-500 text-xs">Items</p>
                      <p className="font-medium">
                        {purchase.items?.length || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Payment</p>
                      <p className="font-medium capitalize">
                        {purchase.paymentMethod}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Branch</p>
                      <p className="font-medium">{purchase.branch?.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Created By</p>
                      <p className="font-medium">
                        {purchase.creator?.firstName}{" "}
                        {purchase.creator?.lastName}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Purchase Form */}
      {view === "new" && (
        <div className="space-y-6">
          {/* Purchase Info */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Purchase Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Supplier
                </label>
                <div className="flex space-x-2">
                  <select
                    className="form-select flex-1"
                    value={purchaseForm.supplierId}
                    onChange={(e) =>
                      setPurchaseForm({
                        ...purchaseForm,
                        supplierId: e.target.value,
                        supplierName: "",
                      })
                    }
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Or enter new supplier name"
                    className="form-input flex-1"
                    value={purchaseForm.supplierName}
                    onChange={(e) =>
                      setPurchaseForm({
                        ...purchaseForm,
                        supplierName: e.target.value,
                        supplierId: "",
                      })
                    }
                    disabled={!!purchaseForm.supplierId}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Purchase Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={purchaseForm.date}
                  onChange={(e) =>
                    setPurchaseForm({ ...purchaseForm, date: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Auto-generated if empty"
                  value={purchaseForm.reference}
                  onChange={(e) =>
                    setPurchaseForm({
                      ...purchaseForm,
                      reference: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method
                </label>
                <select
                  className="form-select"
                  value={purchaseForm.paymentMethod}
                  onChange={(e) =>
                    setPurchaseForm({
                      ...purchaseForm,
                      paymentMethod: e.target.value,
                      paymentStatus:
                        e.target.value === "credit" ? "pending" : "paid",
                    })
                  }
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="credit">Credit/On Account</option>
                </select>
              </div>
            </div>
          </div>

          {/* Purchase Items */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Items ({purchaseForm.items.length})
              </h3>
              <button
                onClick={() => setShowProductModal(true)}
                className="btn btn-primary btn-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </button>
            </div>

            {purchaseForm.items.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No items added</p>
                <p className="text-xs text-gray-400 mt-1">
                  Click "Add Product" to start adding items
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Product
                      </th>
                      <th className="text-center py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Quantity
                      </th>
                      <th className="text-right py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Unit Cost
                      </th>
                      <th className="text-right py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Total
                      </th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseForm.items.map((item) => (
                      <tr
                        key={item.productId}
                        className="border-b border-gray-100 dark:border-gray-700"
                      >
                        <td className="py-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {item.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              SKU: {item.sku}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            className="form-input w-20 text-center"
                            value={item.quantity}
                            onChange={(e) =>
                              updatePurchaseItem(
                                item.productId,
                                "quantity",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                          <span className="text-xs text-gray-500 ml-1">
                            {item.unit}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="form-input w-24 text-right"
                            value={item.unitCost}
                            onChange={(e) =>
                              updatePurchaseItem(
                                item.productId,
                                "unitCost",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </td>
                        <td className="py-3 text-right font-medium">
                          {formatCurrency(item.quantity * item.unitCost)}
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => removeFromPurchase(item.productId)}
                            className="p-1 text-red-400 hover:text-red-600 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Purchase Summary */}
          {purchaseForm.items.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Purchase Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Subtotal:
                  </span>
                  <span className="font-medium">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    Discount:
                  </span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-input w-24 text-right"
                      value={purchaseForm.discount}
                      onChange={(e) =>
                        setPurchaseForm({
                          ...purchaseForm,
                          discount: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-input w-24 text-right"
                      value={purchaseForm.tax}
                      onChange={(e) =>
                        setPurchaseForm({
                          ...purchaseForm,
                          tax: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      Total:
                    </span>
                    <span className="text-lg font-bold text-primary-600">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Add any additional notes..."
                  value={purchaseForm.notes}
                  onChange={(e) =>
                    setPurchaseForm({ ...purchaseForm, notes: e.target.value })
                  }
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={submitPurchase}
                  disabled={
                    createPurchaseMutation.isLoading ||
                    purchaseForm.items.length === 0
                  }
                  className="flex-1 btn btn-success"
                >
                  {createPurchaseMutation.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Record Purchase
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    resetForm();
                    setView("list");
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product Selection Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add Product
              </h3>
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setProductSearch("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search products..."
                  className="form-input"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="max-h-64 overflow-y-auto">
                {productSearch.length < 2 ? (
                  <p className="text-gray-500 text-center py-4">
                    Type at least 2 characters to search
                  </p>
                ) : products.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No products found
                  </p>
                ) : (
                  <div className="space-y-2">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => addProductToPurchase(product)}
                        className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {product.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              SKU: {product.sku} • Cost:{" "}
                              {formatCurrency(product.costPrice)}
                            </p>
                          </div>
                          <Plus className="w-4 h-4 text-primary-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Details Modal */}
      {showPurchaseModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Purchase Details - {selectedPurchase.reference}
              </h3>
              <button
                onClick={() => {
                  setShowPurchaseModal(false);
                  setSelectedPurchase(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="text-center py-8">
                <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Purchase details view coming soon...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasesPage;
