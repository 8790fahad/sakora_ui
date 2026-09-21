import React, { useState, useEffect, useRef } from "react";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Eye,
  Edit3,
  Trash2,
  Camera,
  Paperclip,
  X,
  Save,
  Tag,
  CreditCard,
  Banknote,
  Building,
  Settings,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import api from "../../services/api";

const ExpensesPage = () => {
  const [view, setView] = useState("list"); // 'list' or 'new' or 'categories'
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // New expense form state
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    expenseCategoryId: "",
    paymentMethod: "cash",
    reference: "",
    notes: "",
    receipt: null,
  });

  // New category form state
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    color: "#6B7280",
    icon: "",
  });

  const [editingCategory, setEditingCategory] = useState(null);
  const fileInputRef = useRef(null);

  const queryClient = useQueryClient();

  // Fetch expenses
  const {
    data: expensesData,
    isLoading: expensesLoading,
    refetch: refetchExpenses,
  } = useQuery(
    ["expenses", { search, categoryFilter, paymentFilter, dateFilter }],
    () =>
      api.expenses.list({
        search,
        category: categoryFilter === "all" ? undefined : categoryFilter,
        paymentMethod: paymentFilter === "all" ? undefined : paymentFilter,
        dateFrom: dateFilter || undefined,
        page: 1,
        limit: 50,
      }),
    {
      refetchOnWindowFocus: false,
    }
  );

  // Fetch expense categories
  const { data: categoriesData, refetch: refetchCategories } = useQuery(
    "expense-categories",
    () => api.expenses.categories(),
    {
      refetchOnWindowFocus: false,
    }
  );

  // Create expense mutation
  const createExpenseMutation = useMutation(
    (formData) => api.expenses.create(formData),
    {
      onSuccess: (data) => {
        toast.success("Expense recorded successfully!");
        resetExpenseForm();
        setView("list");
        queryClient.invalidateQueries("expenses");
        queryClient.invalidateQueries("dashboard");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to record expense");
      },
    }
  );

  // Create category mutation
  const createCategoryMutation = useMutation(api.expenses.createCategory, {
    onSuccess: () => {
      toast.success("Category created successfully!");
      resetCategoryForm();
      setShowCategoryModal(false);
      refetchCategories();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create category");
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation(
    ({ id, ...data }) => api.expenses.updateCategory(id, data),
    {
      onSuccess: () => {
        toast.success("Category updated successfully!");
        resetCategoryForm();
        setShowCategoryModal(false);
        setEditingCategory(null);
        refetchCategories();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update category");
      },
    }
  );

  // Delete category mutation
  const deleteCategoryMutation = useMutation(api.expenses.deleteCategory, {
    onSuccess: () => {
      toast.success("Category deleted successfully!");
      refetchCategories();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete category");
    },
  });

  const expenses = expensesData?.data?.items || [];
  const categories = categoriesData?.data?.categories || [];

  const resetExpenseForm = () => {
    setExpenseForm({
      description: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      expenseCategoryId: "",
      paymentMethod: "cash",
      reference: "",
      notes: "",
      receipt: null,
    });
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: "",
      description: "",
      color: "#6B7280",
      icon: "",
    });
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setExpenseForm({ ...expenseForm, receipt: file });
    }
  };

  const submitExpense = () => {
    if (!expenseForm.description.trim()) {
      toast.error("Enter expense description");
      return;
    }
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
      toast.error("Enter valid amount");
      return;
    }
    if (!expenseForm.expenseCategoryId) {
      toast.error("Select expense category");
      return;
    }

    const formData = new FormData();
    formData.append("description", expenseForm.description);
    formData.append("amount", expenseForm.amount);
    formData.append("date", expenseForm.date);
    formData.append("expenseCategoryId", expenseForm.expenseCategoryId);
    formData.append("paymentMethod", expenseForm.paymentMethod);
    if (expenseForm.reference)
      formData.append("reference", expenseForm.reference);
    if (expenseForm.notes) formData.append("notes", expenseForm.notes);
    if (expenseForm.receipt) formData.append("receipt", expenseForm.receipt);

    createExpenseMutation.mutate(formData);
  };

  const submitCategory = () => {
    if (!categoryForm.name.trim()) {
      toast.error("Enter category name");
      return;
    }

    if (editingCategory) {
      updateCategoryMutation.mutate({
        id: editingCategory.id,
        ...categoryForm,
      });
    } else {
      createCategoryMutation.mutate(categoryForm);
    }
  };

  const editCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || "",
      color: category.color || "#6B7280",
      icon: category.icon || "",
    });
    setShowCategoryModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case "cash":
        return <Banknote className="w-4 h-4" />;
      case "bank_transfer":
        return <Building className="w-4 h-4" />;
      case "card":
        return <CreditCard className="w-4 h-4" />;
      case "cheque":
        return <Receipt className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const predefinedColors = [
    "#EF4444",
    "#F97316",
    "#F59E0B",
    "#EAB308",
    "#84CC16",
    "#22C55E",
    "#10B981",
    "#14B8A6",
    "#06B6D4",
    "#0EA5E9",
    "#3B82F6",
    "#6366F1",
    "#8B5CF6",
    "#A855F7",
    "#D946EF",
    "#EC4899",
    "#F43F5E",
    "#6B7280",
    "#374151",
    "#1F2937",
  ];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Expense Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {view === "list" && "Track business expenses and receipts"}
            {view === "new" && "Record a new expense"}
            {view === "categories" && "Manage expense categories"}
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
              <Receipt className="w-4 h-4 mr-2 inline" />
              Expenses
            </button>
            <button
              onClick={() => setView("new")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                view === "new"
                  ? "bg-primary-100 text-primary-600 border-primary-300"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Plus className="w-4 h-4 mr-2 inline" />
              New Expense
            </button>
            <button
              onClick={() => setView("categories")}
              className={`px-4 py-2 rounded-r-lg text-sm font-medium transition-colors ${
                view === "categories"
                  ? "bg-primary-100 text-primary-600 border-primary-300"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Settings className="w-4 h-4 mr-2 inline" />
              Categories
            </button>
          </div>
        </div>
      </div>

      {/* Expense List */}
      {view === "list" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="card p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Description, notes..."
                    className="form-input pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  className="form-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method
                </label>
                <select
                  className="form-select"
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                >
                  <option value="all">All Methods</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
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
                    setCategoryFilter("all");
                    setPaymentFilter("all");
                    setDateFilter("");
                  }}
                  className="btn btn-outline w-full"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Expenses List */}
          {expensesLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading expenses...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                No expenses found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {search ||
                categoryFilter !== "all" ||
                paymentFilter !== "all" ||
                dateFilter
                  ? "Try adjusting your search or filters"
                  : "Get started by recording your first expense"}
              </p>
              <button
                onClick={() => setView("new")}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Record Expense
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.map((expense) => (
                <div key={expense.id} className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: expense.category?.color + "20",
                        }}
                      >
                        <Receipt
                          className="w-5 h-5"
                          style={{
                            color: expense.category?.color || "#6B7280",
                          }}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {expense.description}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(expense.date).toLocaleDateString()} •{" "}
                          <span
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: expense.category?.color + "20",
                              color: expense.category?.color || "#6B7280",
                            }}
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {expense.category?.name}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900 dark:text-white">
                          {formatCurrency(expense.amount)}
                        </p>
                        <div className="flex items-center text-sm text-gray-500">
                          {getPaymentMethodIcon(expense.paymentMethod)}
                          <span className="ml-1 capitalize">
                            {expense.paymentMethod.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedExpense(expense);
                          setShowExpenseModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Additional info */}
                  <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Reference</p>
                      <p className="font-medium">{expense.reference || "-"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Branch</p>
                      <p className="font-medium">{expense.branch?.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Receipt</p>
                      <p className="font-medium">
                        {expense.receiptPath ? "✓ Attached" : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Expense Form */}
      {view === "new" && (
        <div className="space-y-6">
          {/* Expense Details */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Expense Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="What was this expense for?"
                  value={expenseForm.description}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    ₦
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input pl-8"
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, amount: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={expenseForm.date}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, date: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category *
                </label>
                <select
                  className="form-select"
                  value={expenseForm.expenseCategoryId}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      expenseCategoryId: e.target.value,
                    })
                  }
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method *
                </label>
                <select
                  className="form-select"
                  value={expenseForm.paymentMethod}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      paymentMethod: e.target.value,
                    })
                  }
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Optional reference"
                  value={expenseForm.reference}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      reference: e.target.value,
                    })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Additional details..."
                  value={expenseForm.notes}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, notes: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Receipt Upload */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Receipt Attachment
            </h3>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
              {expenseForm.receipt ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Paperclip className="w-5 h-5 text-primary-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {expenseForm.receipt.name}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({(expenseForm.receipt.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setExpenseForm({ ...expenseForm, receipt: null })
                    }
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Upload receipt or photo (optional)
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-outline"
                  >
                    <Paperclip className="w-4 h-4 mr-2" />
                    Choose File
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    Max size: 5MB • JPG, PNG, PDF
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={submitExpense}
              disabled={createExpenseMutation.isLoading}
              className="flex-1 btn btn-success"
            >
              {createExpenseMutation.isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Record Expense
                </>
              )}
            </button>
            <button
              onClick={() => {
                resetExpenseForm();
                setView("list");
              }}
              className="btn btn-outline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Categories Management */}
      {view === "categories" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Expense Categories
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Organize your expenses by category
              </p>
            </div>
            <button
              onClick={() => {
                resetCategoryForm();
                setEditingCategory(null);
                setShowCategoryModal(true);
              }}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div key={category.id} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: category.color + "20" }}
                    >
                      <Tag
                        className="w-4 h-4"
                        style={{ color: category.color }}
                      />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {category.name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {category.expenseCount || 0} expenses
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => editCategory(category)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("Delete this category?")) {
                          deleteCategoryMutation.mutate(category.id);
                        }
                      }}
                      className="p-1 text-red-400 hover:text-red-600 rounded"
                      disabled={(category.expenseCount || 0) > 0}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {category.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {category.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingCategory ? "Edit Category" : "New Category"}
              </h3>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  resetCategoryForm();
                  setEditingCategory(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Office Supplies"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Optional description"
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color
                </label>
                <div className="grid grid-cols-10 gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      onClick={() =>
                        setCategoryForm({ ...categoryForm, color })
                      }
                      className={`w-8 h-8 rounded-full border-2 ${
                        categoryForm.color === color
                          ? "border-gray-900 dark:border-white"
                          : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex space-x-3 p-4">
              <button
                onClick={submitCategory}
                disabled={
                  createCategoryMutation.isLoading ||
                  updateCategoryMutation.isLoading
                }
                className="flex-1 btn btn-primary"
              >
                {createCategoryMutation.isLoading ||
                updateCategoryMutation.isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editingCategory ? "Update" : "Create"} Category
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  resetCategoryForm();
                  setEditingCategory(null);
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Details Modal */}
      {showExpenseModal && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Expense Details
              </h3>
              <button
                onClick={() => {
                  setShowExpenseModal(false);
                  setSelectedExpense(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Expense details view coming soon...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;
