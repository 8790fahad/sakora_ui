import React, { useState } from "react";
import {
  Package,
  Plus,
  Search,
  ChevronRight,
  AlertTriangle,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import api from "../../services/api";

const ProductsPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductSheet, setShowProductSheet] = useState(false);

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      sku: "",
      categoryId: "",
      costPrice: "",
      sellingPrice: "",
      unit: "piece",
      lowStockThreshold: 10,
      initialStock: 0,
      description: "",
    },
  });

  // Watch prices for margin calculation
  const costPrice = watch("costPrice");
  const sellingPrice = watch("sellingPrice");
  const profitMargin =
    costPrice && sellingPrice
      ? (((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(1)
      : 0;

  // Fetch products
  const { data: productsData, isLoading: productsLoading } = useQuery(
    ["products", { search, categoryFilter }],
    () =>
      api.products.list({
        search,
        category: categoryFilter || undefined,
        status: "active",
        page: 1,
        limit: 50,
      }),
    { refetchOnWindowFocus: false }
  );

  // Fetch categories
  const { data: categoriesData } = useQuery(
    "product-categories",
    () => api.products.categories(),
    { refetchOnWindowFocus: false }
  );

  const products = productsData?.data?.items || [];
  const categories = categoriesData?.data?.categories || [];

  // Create product mutation
  const createProductMutation = useMutation(
    (data) => api.products.create(data),
    {
      onSuccess: () => {
        toast.success("Product created successfully!");
        queryClient.invalidateQueries("products");
        handleCloseSheet();
      },
      onError: (error) => {
        toast.error(
          error.response?.data?.message || "Failed to create product"
        );
      },
    }
  );

  // Update product mutation
  const updateProductMutation = useMutation(
    ({ id, data }) => api.products.update(id, data),
    {
      onSuccess: () => {
        toast.success("Product updated successfully!");
        queryClient.invalidateQueries("products");
        handleCloseSheet();
      },
      onError: (error) => {
        toast.error(
          error.response?.data?.message || "Failed to update product"
        );
      },
    }
  );

  // Delete product mutation
  const deleteProductMutation = useMutation((id) => api.products.delete(id), {
    onSuccess: () => {
      toast.success("Product deleted!");
      queryClient.invalidateQueries("products");
      handleCloseSheet();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete product");
    },
  });

  const handleCloseSheet = () => {
    setShowProductSheet(false);
    setSelectedProduct(null);
    reset({
      name: "",
      sku: "",
      categoryId: "",
      costPrice: "",
      sellingPrice: "",
      unit: "piece",
      lowStockThreshold: 10,
      initialStock: 0,
      description: "",
    });
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    reset({
      name: "",
      sku: "",
      categoryId: "",
      costPrice: "",
      sellingPrice: "",
      unit: "piece",
      lowStockThreshold: 10,
      initialStock: 0,
      description: "",
    });
    setShowProductSheet(true);
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    reset({
      name: product.name || "",
      sku: product.sku || "",
      categoryId: product.categoryId || "",
      costPrice: product.costPrice || "",
      sellingPrice: product.sellingPrice || "",
      unit: product.unit || "pcs",
      lowStockThreshold: product.lowStockThreshold || 10,
      initialStock: product.inventory?.[0]?.quantity || 0,
      description: product.description || "",
    });
    setShowProductSheet(true);
  };

  const onSubmit = (data) => {
    const productData = {
      name: data.name,
      sku: data.sku || undefined,
      categoryId: data.categoryId || null,
      costPrice: parseFloat(data.costPrice) || 0,
      sellingPrice: parseFloat(data.sellingPrice) || 0,
      unit: data.unit || "piece",
      lowStockThreshold: parseInt(data.lowStockThreshold) || 10,
      openingStock: parseFloat(data.initialStock) || 0,
      description: data.description || "",
    };

    if (selectedProduct) {
      updateProductMutation.mutate({
        id: selectedProduct.id,
        data: productData,
      });
    } else {
      createProductMutation.mutate(productData);
    }
  };

  const handleDeleteProduct = () => {
    if (selectedProduct && window.confirm("Delete this product?")) {
      deleteProductMutation.mutate(selectedProduct.id);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStockStatus = (product) => {
    const inventory = product.inventory?.[0];
    if (!inventory) return { status: "No Stock", color: "gray" };
    const available = parseFloat(inventory.quantity || 0);
    const threshold = inventory.reorderPoint || product.lowStockThreshold || 10;
    if (available <= 0) return { status: "Out", color: "red" };
    if (available <= threshold) return { status: "Low", color: "orange" };
    return { status: `${available}`, color: "green" };
  };

  return (
    <div className="pb-4">
      {/* Search Bar */}
      <div className="px-4 py-3 bg-[var(--ios-bg-grouped)]">
        <div className="ios-search-input-wrapper">
          <Search className="ios-search-icon" />
          <input
            type="search"
            placeholder="Search products..."
            className="ios-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2">
          <button
            onClick={() => setCategoryFilter("")}
            className={`ios-btn-sm whitespace-nowrap ${
              !categoryFilter
                ? "bg-[var(--ios-blue)] text-white"
                : "bg-[var(--ios-gray-5)] text-[var(--ios-text-primary)]"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`ios-btn-sm whitespace-nowrap ${
                categoryFilter === cat.id
                  ? "bg-[var(--ios-blue)] text-white"
                  : "bg-[var(--ios-gray-5)] text-[var(--ios-text-primary)]"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products List */}
      {productsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--ios-blue)]" />
        </div>
      ) : products.length === 0 ? (
        <div className="ios-empty-state">
          <Package className="ios-empty-state-icon" />
          <h3 className="ios-empty-state-title">No Products</h3>
          <p className="ios-empty-state-message">
            {search
              ? "No products match your search"
              : "Add your first product to get started"}
          </p>
          <button
            onClick={handleAddProduct}
            className="ios-btn ios-btn-primary"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Product
          </button>
        </div>
      ) : (
        <div className="ios-section">
          <p className="ios-section-header">{products.length} Products</p>
          <div className="ios-list mx-4">
            {products.map((product) => {
              const stockStatus = getStockStatus(product);
              return (
                <button
                  key={product.id}
                  onClick={() => handleEditProduct(product)}
                  className="ios-list-item w-full text-left"
                >
                  {/* Product Image/Icon */}
                  <div className="w-12 h-12 rounded-xl bg-[var(--ios-gray-6)] flex items-center justify-center mr-3 flex-shrink-0">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-[var(--ios-gray-2)]" />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[17px] font-medium truncate pr-2">
                        {product.name}
                      </p>
                      <span
                        className={`text-[13px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                          stockStatus.color === "green"
                            ? "bg-green-100 text-green-700"
                            : stockStatus.color === "orange"
                            ? "bg-orange-100 text-orange-700"
                            : stockStatus.color === "red"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {stockStatus.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[15px] text-[var(--ios-gray-1)]">
                        {formatCurrency(product.sellingPrice)}
                      </p>
                      {product.category && (
                        <span
                          className="text-[13px] px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${product.category.color}20`,
                            color: product.category.color,
                          }}
                        >
                          {product.category.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-[var(--ios-gray-3)] ml-2 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Product FAB - only show when not empty */}
      {products.length > 0 && (
        <button
          onClick={handleAddProduct}
          className="ios-fab"
          style={{ bottom: "calc(var(--tab-bar-height) + 20px)" }}
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Product Sheet (iOS Bottom Sheet) */}
      {showProductSheet && (
        <>
          <div className="ios-sheet-overlay" onClick={handleCloseSheet} />
          <div className="ios-sheet" style={{ maxHeight: "95vh" }}>
            <div className="ios-sheet-handle" />

            {/* Sheet Header */}
            <div className="ios-sheet-header">
              <button
                onClick={handleCloseSheet}
                className="text-[17px] text-[var(--ios-blue)]"
              >
                Cancel
              </button>
              <h3 className="ios-sheet-title">
                {selectedProduct ? "Edit Product" : "New Product"}
              </h3>
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={
                  createProductMutation.isLoading ||
                  updateProductMutation.isLoading
                }
                className="text-[17px] font-semibold text-[var(--ios-blue)]"
              >
                {createProductMutation.isLoading ||
                updateProductMutation.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Save"
                )}
              </button>
            </div>

            {/* Sheet Content */}
            <div className="ios-sheet-content px-4 pb-8">
              <form onSubmit={handleSubmit(onSubmit)}>
                {/* Product Name */}
                <div className="ios-section">
                  <p className="ios-section-header">Product Details</p>
                  <div className="ios-list mx-0">
                    <div className="ios-input-wrapper">
                      <label className="ios-input-label">Name</label>
                      <input
                        type="text"
                        className="ios-input"
                        placeholder="Product name"
                        {...register("name", { required: true })}
                      />
                    </div>
                    <div className="ios-input-wrapper">
                      <label className="ios-input-label">SKU</label>
                      <input
                        type="text"
                        className="ios-input"
                        placeholder="Auto-generated"
                        {...register("sku")}
                      />
                    </div>
                    <div className="ios-input-wrapper">
                      <label className="ios-input-label">Category</label>
                      <select
                        className="ios-input bg-transparent"
                        {...register("categoryId")}
                      >
                        <option value="">Select</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="ios-section">
                  <p className="ios-section-header">Pricing</p>
                  <div className="ios-list mx-0">
                    <div className="ios-input-wrapper">
                      <label className="ios-input-label">Cost Price</label>
                      <input
                        type="number"
                        step="0.01"
                        className="ios-input"
                        placeholder="₦0.00"
                        {...register("costPrice", { required: true })}
                      />
                    </div>
                    <div className="ios-input-wrapper">
                      <label className="ios-input-label">Selling Price</label>
                      <input
                        type="number"
                        step="0.01"
                        className="ios-input"
                        placeholder="₦0.00"
                        {...register("sellingPrice", { required: true })}
                      />
                    </div>
                  </div>
                  {costPrice > 0 && sellingPrice > 0 && (
                    <p className="ios-section-footer">
                      Profit: ₦{(sellingPrice - costPrice).toFixed(2)} (
                      {profitMargin}% margin)
                    </p>
                  )}
                </div>

                {/* Inventory */}
                <div className="ios-section">
                  <p className="ios-section-header">Inventory</p>
                  <div className="ios-list mx-0">
                    <div className="ios-input-wrapper">
                      <label className="ios-input-label">Unit</label>
                      <select
                        className="ios-input bg-transparent"
                        {...register("unit")}
                      >
                        <option value="piece">Pieces</option>
                        <option value="kg">Kilograms</option>
                        <option value="g">Grams</option>
                        <option value="liter">Liters</option>
                        <option value="ml">Milliliters</option>
                        <option value="box">Box</option>
                        <option value="pack">Pack</option>
                        <option value="dozen">Dozen</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="ios-input-wrapper">
                      <label className="ios-input-label">Low Stock Alert</label>
                      <input
                        type="number"
                        className="ios-input"
                        placeholder="10"
                        {...register("lowStockThreshold")}
                      />
                    </div>
                    {!selectedProduct && (
                      <div className="ios-input-wrapper">
                        <label className="ios-input-label">Initial Stock</label>
                        <input
                          type="number"
                          className="ios-input"
                          placeholder="0"
                          {...register("initialStock")}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="ios-section">
                  <p className="ios-section-header">Description (Optional)</p>
                  <textarea
                    className="ios-textarea mx-0"
                    placeholder="Add product description..."
                    rows={3}
                    {...register("description")}
                  />
                </div>

                {/* Delete Button */}
                {selectedProduct && (
                  <div className="ios-section">
                    <button
                      type="button"
                      onClick={handleDeleteProduct}
                      disabled={deleteProductMutation.isLoading}
                      className="ios-btn ios-btn-full justify-center"
                      style={{
                        color: "var(--ios-red)",
                        backgroundColor: "rgba(255, 59, 48, 0.1)",
                      }}
                    >
                      {deleteProductMutation.isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <Trash2 className="w-5 h-5 mr-2" />
                      )}
                      Delete Product
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductsPage;
