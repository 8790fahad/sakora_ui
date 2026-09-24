import React, { useState } from "react";
import {
  Users,
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
  ShoppingCart,
  AlertTriangle,
  X,
  Save,
  User,
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

const CustomersPage = () => {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Customer form state
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    tin: "",
    customerType: "individual",
  });

  const queryClient = useQueryClient();

  // Fetch customers
  const {
    data: customersData,
    isLoading: customersLoading,
    refetch: refetchCustomers,
  } = useQuery(
    ["customers", { search }],
    () =>
      api.customers.list({
        search,
        page: 1,
        limit: 50,
      }),
    {
      refetchOnWindowFocus: false,
    }
  );

  // Create customer mutation
  const createCustomerMutation = useMutation(api.customers.create, {
    onSuccess: (data) => {
      toast.success("Customer created successfully!");
      resetForm();
      setShowFormModal(false);
      queryClient.invalidateQueries("customers");
    },
    onError: (error) => {
      // Error toast is already shown by API interceptor, just log for debugging
      console.error("Customer creation error:", error);
    },
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation(
    ({ id, ...data }) => api.customers.update(id, data),
    {
      onSuccess: () => {
        toast.success("Customer updated successfully!");
        resetForm();
        setShowFormModal(false);
        setEditingCustomer(null);
        queryClient.invalidateQueries("customers");
      },
      onError: (error) => {
        // Error toast is already shown by API interceptor, just log for debugging
        console.error("Customer update error:", error);
      },
    }
  );

  // Delete customer mutation
  const deleteCustomerMutation = useMutation(api.customers.delete, {
    onSuccess: () => {
      toast.success("Customer deleted successfully!");
      queryClient.invalidateQueries("customers");
    },
    onError: (error) => {
      // Error toast is already shown by API interceptor, just log for debugging
      console.error("Customer deletion error:", error);
    },
  });

  // Get customer details with transactions
  const { data: customerDetailsData, isLoading: customerDetailsLoading } =
    useQuery(
      ["customer-details", selectedCustomer?.id],
      () => api.customers.get(selectedCustomer.id),
      {
        enabled: !!selectedCustomer?.id,
        refetchOnWindowFocus: false,
      }
    );

  const customers = customersData?.data?.items || [];
  const customerDetails = customerDetailsData?.data?.customer;

  const resetForm = () => {
    setCustomerForm({
      name: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      tin: "",
      customerType: "individual",
    });
  };

  const openEditForm = (customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      notes: customer.notes || "",
      tin: customer.tin || "",
      customerType: customer.customerType || "individual",
    });
    setShowFormModal(true);
  };

  const submitCustomer = () => {
    if (!customerForm.name.trim()) {
      toast.error("Enter customer name");
      return;
    }

    if (editingCustomer) {
      updateCustomerMutation.mutate({
        id: editingCustomer.id,
        ...customerForm,
      });
    } else {
      createCustomerMutation.mutate(customerForm);
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
            Customer Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage customer information and track relationships
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setEditingCustomer(null);
            setShowFormModal(true);
          }}
          className="btn btn-primary mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
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
                placeholder="Search customers by name, phone, or email..."
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

      {/* Customers List */}
      {customersLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading customers...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            No customers found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {search
              ? "Try adjusting your search terms"
              : "Get started by adding your first customer"}
          </p>
          <button
            onClick={() => {
              resetForm();
              setEditingCustomer(null);
              setShowFormModal(true);
            }}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer) => (
            <div key={customer.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {customer.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {typeLabel(customer.customerType)}
                      {customer.tin ? ` · TIN ${customer.tin}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerModal(true);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditForm(customer)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("Delete this customer?")) {
                        deleteCustomerMutation.mutate(customer.id);
                      }
                    }}
                    className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    disabled={customer.stats?.totalSales > 0}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                {customer.phone && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Phone className="w-4 h-4 mr-2" />
                    {customer.phone}
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4 mr-2" />
                    {customer.email}
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{customer.address}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Sales</p>
                  <p className="font-semibold text-sm">
                    {customer.stats?.totalSales || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="font-semibold text-sm">
                    {formatCurrency(customer.stats?.totalAmount || 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Outstanding</p>
                  <p
                    className={`font-semibold text-sm ${
                      (customer.stats?.outstandingAmount || 0) > 0
                        ? "text-red-600"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {formatCurrency(customer.stats?.outstandingAmount || 0)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingCustomer ? "Edit Customer" : "Add New Customer"}
              </h3>
              <button
                onClick={() => {
                  setShowFormModal(false);
                  resetForm();
                  setEditingCustomer(null);
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
                  placeholder="Customer name"
                  value={customerForm.name}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  className="form-input"
                  value={customerForm.customerType}
                  onChange={(e) =>
                    setCustomerForm({
                      ...customerForm,
                      customerType: e.target.value,
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
                  value={customerForm.tin}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, tin: e.target.value })
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
                  value={customerForm.phone}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, phone: e.target.value })
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
                  value={customerForm.email}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, email: e.target.value })
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
                  placeholder="Customer address"
                  value={customerForm.address}
                  onChange={(e) =>
                    setCustomerForm({
                      ...customerForm,
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
                  value={customerForm.notes}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, notes: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex space-x-3 p-4">
              <button
                onClick={submitCustomer}
                disabled={
                  createCustomerMutation.isLoading ||
                  updateCustomerMutation.isLoading
                }
                className="flex-1 btn btn-primary"
              >
                {createCustomerMutation.isLoading ||
                updateCustomerMutation.isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editingCustomer ? "Update" : "Create"} Customer
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowFormModal(false);
                  resetForm();
                  setEditingCustomer(null);
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {showCustomerModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedCustomer.name}
                </h3>
                <p className="text-sm text-gray-500">Customer Details</p>
              </div>
              <button
                onClick={() => {
                  setShowCustomerModal(false);
                  setSelectedCustomer(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {customerDetailsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">
                    Loading customer details...
                  </p>
                </div>
              ) : customerDetails ? (
                <div className="space-y-6">
                  {/* Customer Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Contact Information
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <User className="w-5 h-5 text-gray-400 mr-3" />
                          <span>{customerDetails.name}</span>
                        </div>
                        {customerDetails.phone && (
                          <div className="flex items-center">
                            <Phone className="w-5 h-5 text-gray-400 mr-3" />
                            <span>{customerDetails.phone}</span>
                          </div>
                        )}
                        {customerDetails.email && (
                          <div className="flex items-center">
                            <Mail className="w-5 h-5 text-gray-400 mr-3" />
                            <span>{customerDetails.email}</span>
                          </div>
                        )}
                        {customerDetails.address && (
                          <div className="flex items-start">
                            <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                            <span>{customerDetails.address}</span>
                          </div>
                        )}
                        <div className="text-sm text-gray-600">
                          Type: {typeLabel(customerDetails.customerType)}
                        </div>
                        {customerDetails.tin && (
                          <div className="text-sm text-gray-600">
                            TIN: {customerDetails.tin}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Statistics
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                          <p className="text-sm text-blue-600 dark:text-blue-400">
                            Total Sales
                          </p>
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {customerDetails.stats?.totalSales || 0}
                          </p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                          <p className="text-sm text-green-600 dark:text-green-400">
                            Total Amount
                          </p>
                          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                            {formatCurrency(
                              customerDetails.stats?.totalAmount || 0
                            )}
                          </p>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                          <p className="text-sm text-yellow-600 dark:text-yellow-400">
                            Outstanding
                          </p>
                          <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                            {formatCurrency(
                              customerDetails.stats?.outstandingAmount || 0
                            )}
                          </p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                          <p className="text-sm text-purple-600 dark:text-purple-400">
                            Last Sale
                          </p>
                          <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                            {customerDetails.stats?.lastSaleDate
                              ? new Date(
                                  customerDetails.stats.lastSaleDate
                                ).toLocaleDateString()
                              : "Never"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Sales */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                      Recent Sales
                    </h4>
                    {customerDetails.sales &&
                    customerDetails.sales.length > 0 ? (
                      <div className="space-y-3">
                        {customerDetails.sales.slice(0, 5).map((sale) => (
                          <div
                            key={sale.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                Sale #{sale.reference}
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(sale.date).toLocaleDateString()} •{" "}
                                {sale.branch?.name}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(sale.totalAmount)}
                              </p>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  sale.paymentStatus === "paid"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {sale.paymentStatus}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        No sales recorded for this customer
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    Failed to load customer details
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

export default CustomersPage;
