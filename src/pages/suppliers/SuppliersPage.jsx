import React, { useState } from "react";
import {
  Truck,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Eye,
  Edit3,
  Trash2,
  DollarSign,
  ShoppingBag,
  AlertTriangle,
  X,
  Save,
  Building2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import api from "../../services/api";

const PARTY_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "company", label: "Company" },
  { value: "government", label: "Government" },
];

const typeLabel = (value) =>
  PARTY_TYPES.find((item) => item.value === value)?.label || "Individual";

const SuppliersPage = () => {
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // Supplier form state
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    tin: "",
    supplierType: "individual",
  });

  const queryClient = useQueryClient();

  // Fetch suppliers
  const {
    data: suppliersData,
    isLoading: suppliersLoading,
    error: suppliersError,
    refetch: refetchSuppliers,
  } = useQuery(
    ["suppliers", { search }],
    () =>
      api.suppliers.list({
        search,
        page: 1,
        limit: 50,
      }),
    {
      refetchOnWindowFocus: false,
      onError: (error) => {
        console.error("Suppliers query error:", error);
      },
    }
  );

  // Create supplier mutation
  const createSupplierMutation = useMutation(api.suppliers.create, {
    onSuccess: (data) => {
      toast.success("Supplier created successfully!");
      resetForm();
      setShowFormModal(false);
      queryClient.invalidateQueries("suppliers");
    },
    onError: (error) => {
      // Error toast is already shown by API interceptor, just log for debugging
      console.error("Supplier creation error:", error);
    },
  });

  // Update supplier mutation
  const updateSupplierMutation = useMutation(
    ({ id, ...data }) => api.suppliers.update(id, data),
    {
      onSuccess: () => {
        toast.success("Supplier updated successfully!");
        resetForm();
        setShowFormModal(false);
        setEditingSupplier(null);
        queryClient.invalidateQueries("suppliers");
      },
      onError: (error) => {
        // Error toast is already shown by API interceptor, just log for debugging
        console.error("Supplier update error:", error);
      },
    }
  );

  // Delete supplier mutation
  const deleteSupplierMutation = useMutation(api.suppliers.delete, {
    onSuccess: () => {
      toast.success("Supplier deleted successfully!");
      queryClient.invalidateQueries("suppliers");
    },
    onError: (error) => {
      // Error toast is already shown by API interceptor, just log for debugging
      console.error("Supplier deletion error:", error);
    },
  });

  // Get supplier details with transactions
  const { data: supplierDetailsData, isLoading: supplierDetailsLoading } =
    useQuery(
      ["supplier-details", selectedSupplier?.id],
      () => api.suppliers.get(selectedSupplier.id),
      {
        enabled: !!selectedSupplier?.id,
        refetchOnWindowFocus: false,
      }
    );

  // Extract suppliers from response
  // Response interceptor now returns response.data directly
  // So suppliersData = {success: true, data: {items: [...], pagination: {...}}}
  // suppliersData.data = {items: [...], pagination: {...}}
  // suppliersData.data.items = [...]
  const suppliers = suppliersData?.data?.items || [];

  const supplierDetails = supplierDetailsData?.data?.supplier;

  const resetForm = () => {
    setSupplierForm({
      name: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      tin: "",
      supplierType: "individual",
    });
  };

  const openEditForm = (supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name,
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
      tin: supplier.tin || "",
      supplierType: supplier.supplierType || "individual",
    });
    setShowFormModal(true);
  };

  const submitSupplier = () => {
    if (!supplierForm.name.trim()) {
      toast.error("Enter supplier name");
      return;
    }

    if (editingSupplier) {
      updateSupplierMutation.mutate({
        id: editingSupplier.id,
        ...supplierForm,
      });
    } else {
      createSupplierMutation.mutate(supplierForm);
    }
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Supplier Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage supplier information and track relationships
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setEditingSupplier(null);
            setShowFormModal(true);
          }}
          className="btn btn-primary mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Supplier
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search suppliers by name, phone, or email..."
                className="form-input pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <button onClick={() => setSearch("")} className="btn btn-outline">
            Clear
          </button>
        </div>
      </div>

      {/* Suppliers List */}
      {suppliersError ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-red-900 dark:text-red-100 mb-1">
            Error loading suppliers
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {suppliersError.message || "Please try again"}
          </p>
          <button
            onClick={() => refetchSuppliers()}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      ) : suppliersLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading suppliers...</p>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-12">
          <Truck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            No suppliers found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {search
              ? "Try adjusting your search terms"
              : "Get started by adding your first supplier"}
          </p>
          <button
            onClick={() => {
              resetForm();
              setEditingSupplier(null);
              setShowFormModal(true);
            }}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Supplier
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((supplier) => (
            <div key={supplier.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {supplier.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {typeLabel(supplier.supplierType)}
                      {supplier.tin ? ` · TIN ${supplier.tin}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      setSelectedSupplier(supplier);
                      setShowSupplierModal(true);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditForm(supplier)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("Delete this supplier?")) {
                        deleteSupplierMutation.mutate(supplier.id);
                      }
                    }}
                    className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    disabled={supplier.stats?.totalPurchases > 0}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                {supplier.phone && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Phone className="w-4 h-4 mr-2" />
                    {supplier.phone}
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4 mr-2" />
                    {supplier.email}
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{supplier.address}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Purchases</p>
                  <p className="font-semibold text-sm">
                    {supplier.stats?.totalPurchases || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="font-semibold text-sm">
                    {formatCurrency(supplier.stats?.totalAmount || 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Outstanding</p>
                  <p
                    className={`font-semibold text-sm ${
                      (supplier.stats?.outstandingAmount || 0) > 0
                        ? "text-red-600"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {formatCurrency(supplier.stats?.outstandingAmount || 0)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supplier Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
              </h3>
              <button
                onClick={() => {
                  setShowFormModal(false);
                  resetForm();
                  setEditingSupplier(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Supplier name"
                  value={supplierForm.name}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  className="form-input"
                  value={supplierForm.supplierType}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      supplierType: e.target.value,
                    })
                  }
                >
                  {PARTY_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  TIN
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Tax identification number"
                  value={supplierForm.tin}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, tin: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="Phone number"
                  value={supplierForm.phone}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Email address"
                  value={supplierForm.email}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Supplier address"
                  value={supplierForm.address}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      address: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Additional notes"
                  value={supplierForm.notes}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, notes: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex space-x-3 p-4">
              <button
                onClick={submitSupplier}
                disabled={
                  createSupplierMutation.isLoading ||
                  updateSupplierMutation.isLoading
                }
                className="flex-1 btn btn-primary"
              >
                {createSupplierMutation.isLoading ||
                updateSupplierMutation.isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editingSupplier ? "Update" : "Create"} Supplier
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowFormModal(false);
                  resetForm();
                  setEditingSupplier(null);
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Details Modal */}
      {showSupplierModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedSupplier.name}
                </h3>
                <p className="text-sm text-gray-500">Supplier Details</p>
              </div>
              <button
                onClick={() => {
                  setShowSupplierModal(false);
                  setSelectedSupplier(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {supplierDetailsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">
                    Loading supplier details...
                  </p>
                </div>
              ) : supplierDetails ? (
                <div className="space-y-6">
                  {/* Supplier Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Contact Information
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                          <span>{supplierDetails.name}</span>
                        </div>
                        {supplierDetails.phone && (
                          <div className="flex items-center">
                            <Phone className="w-5 h-5 text-gray-400 mr-3" />
                            <span>{supplierDetails.phone}</span>
                          </div>
                        )}
                        {supplierDetails.email && (
                          <div className="flex items-center">
                            <Mail className="w-5 h-5 text-gray-400 mr-3" />
                            <span>{supplierDetails.email}</span>
                          </div>
                        )}
                        {supplierDetails.address && (
                          <div className="flex items-start">
                            <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                            <span>{supplierDetails.address}</span>
                          </div>
                        )}
                        <div className="text-sm text-gray-600">
                          Type: {typeLabel(supplierDetails.supplierType)}
                        </div>
                        {supplierDetails.tin && (
                          <div className="text-sm text-gray-600">
                            TIN: {supplierDetails.tin}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Statistics
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                          <p className="text-sm text-orange-600 dark:text-orange-400">
                            Total Purchases
                          </p>
                          <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                            {supplierDetails.stats?.totalPurchases || 0}
                          </p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                          <p className="text-sm text-green-600 dark:text-green-400">
                            Total Amount
                          </p>
                          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                            {formatCurrency(
                              supplierDetails.stats?.totalAmount || 0
                            )}
                          </p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                          <p className="text-sm text-red-600 dark:text-red-400">
                            Outstanding
                          </p>
                          <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                            {formatCurrency(
                              supplierDetails.stats?.outstandingAmount || 0
                            )}
                          </p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                          <p className="text-sm text-purple-600 dark:text-purple-400">
                            Last Purchase
                          </p>
                          <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                            {supplierDetails.stats?.lastPurchaseDate
                              ? new Date(
                                  supplierDetails.stats.lastPurchaseDate
                                ).toLocaleDateString()
                              : "Never"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Purchases */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                      Recent Purchases
                    </h4>
                    {supplierDetails.purchases &&
                    supplierDetails.purchases.length > 0 ? (
                      <div className="space-y-3">
                        {supplierDetails.purchases
                          .slice(0, 5)
                          .map((purchase) => (
                            <div
                              key={purchase.id}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                            >
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  Purchase #{purchase.reference}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {new Date(purchase.date).toLocaleDateString()}{" "}
                                  • {purchase.branch?.name}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {formatCurrency(purchase.totalAmount)}
                                </p>
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    purchase.paymentStatus === "paid"
                                      ? "bg-green-100 text-green-800"
                                      : purchase.paymentStatus === "pending"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {purchase.paymentStatus}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        No purchases recorded from this supplier
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    Failed to load supplier details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;
