import React, { useMemo, useRef, useState } from "react";
import {
  Package,
  Plus,
  Search,
  ChevronRight,
  Trash2,
  Loader2,
  Share2,
  Upload,
  Download,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";
import { productUrl, shareProductText, whatsappLink } from "../../utils/share";
import {
  downloadProductImportTemplate,
  parseProductImportFile,
} from "../../utils/productImport";

const toDateInput = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const daysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${toDateInput(expiryDate)}T00:00:00`);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
};

const emptyForm = {
  name: "",
  sku: "",
  categoryId: "",
  costPrice: "",
  sellingPrice: "",
  unit: "piece",
  lowStockThreshold: 10,
  expiryDate: "",
  initialStock: 0,
  description: "",
  isOnline: true,
};

const ProductsPage = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const stockFilter = searchParams.get("filter") || "all";
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductSheet, setShowProductSheet] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);

  const setStockFilter = (value) => {
    if (value === "all") {
      const next = new URLSearchParams(searchParams);
      next.delete("filter");
      setSearchParams(next, { replace: true });
      return;
    }
    setSearchParams({ filter: value }, { replace: true });
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
  } = useForm({
    defaultValues: emptyForm,
  });
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const costPrice = watch("costPrice");
  const sellingPrice = watch("sellingPrice");
  const profitMargin =
    costPrice && sellingPrice
      ? (((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(1)
      : 0;

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

  const { data: categoriesData } = useQuery(
    "product-categories",
    () => api.products.categories(),
    { refetchOnWindowFocus: false }
  );

  const { data: shopData } = useQuery(
    "storefront-settings",
    api.storefront.settings,
    { refetchOnWindowFocus: false }
  );

  const { data: settingsData } = useQuery("settings", api.settings.get, {
    refetchOnWindowFocus: false,
  });

  const products = productsData?.data?.items || [];
  const categories = categoriesData?.data?.categories || [];
  const shop = shopData?.data || {};
  const shopSlug = shop.slug;
  const expiryAlertDays =
    settingsData?.data?.business?.expiryAlertDays ?? 30;

  const shareProduct = async (event, product) => {
    event.stopPropagation();
    if (!shopSlug) {
      toast.error("Turn on your shop first");
      return;
    }
    const url = productUrl(shopSlug, product.id);
    const text = shareProductText(shop.name || shopSlug, product, url);
    window.open(whatsappLink("", text), "_blank");
  };

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

  const bulkImportMutation = useMutation(
    (products) => api.products.bulkImport({ products }),
    {
      onSuccess: (response) => {
        const count =
          response?.data?.importedCount ??
          response?.data?.imported?.length ??
          0;
        toast.success(`Imported ${count} product${count === 1 ? "" : "s"}`);
        queryClient.invalidateQueries("products");
        queryClient.invalidateQueries("product-categories");
      },
      // API interceptor already toasts the error message (includes first bad row)
    }
  );

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls") && !lower.endsWith(".csv")) {
      toast.error("Please upload an Excel (.xlsx) or CSV file");
      return;
    }

    setImporting(true);
    try {
      const products = await parseProductImportFile(file);
      await bulkImportMutation.mutateAsync(products);
    } catch (error) {
      toast.error(error.message || "Could not read the file");
    } finally {
      setImporting(false);
    }
  };

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

  const createCategoryMutation = useMutation(
    (data) => api.products.createCategory(data),
    {
      onSuccess: (response) => {
        const category = response?.data?.category;
        toast.success("Category added");
        queryClient.invalidateQueries("product-categories");
        if (category?.id) {
          setValue("categoryId", category.id);
        }
        setNewCategoryName("");
        setShowNewCategory(false);
      },
      onError: (error) => {
        toast.error(
          error.response?.data?.message || "Failed to add category"
        );
      },
    }
  );

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (name.length < 2) {
      toast.error("Enter a category name");
      return;
    }
    createCategoryMutation.mutate({ name });
  };

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
    setShowNewCategory(false);
    setNewCategoryName("");
    reset(emptyForm);
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    reset(emptyForm);
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
      unit: product.unit || "piece",
      lowStockThreshold: product.lowStockThreshold || 10,
      expiryDate: toDateInput(product.expiryDate),
      initialStock: product.inventory?.[0]?.quantity || 0,
      description: product.description || "",
      isOnline: product.isOnline !== false,
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
      lowStockThreshold: parseInt(data.lowStockThreshold, 10) || 10,
      expiryDate: data.expiryDate || null,
      openingStock: parseFloat(data.initialStock) || 0,
      description: data.description || "",
      isOnline: Boolean(data.isOnline),
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

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);

  const getStockStatus = (product) => {
    const inventory = product.inventory?.[0];
    if (!inventory) return { status: "No Stock", color: "gray" };
    const available = parseFloat(inventory.quantity || 0);
    const threshold = inventory.reorderPoint || product.lowStockThreshold || 10;
    if (available <= 0) return { status: "Out", color: "red" };
    if (available <= threshold) return { status: "Reorder", color: "orange" };
    return { status: `${available}`, color: "green" };
  };

  const getExpiryStatus = (product) => {
    const days = daysUntilExpiry(product.expiryDate);
    if (days === null) return null;
    if (days < 0) return { status: "Expired", color: "red" };
    if (days <= expiryAlertDays) {
      return {
        status: days === 0 ? "Expires today" : `${days}d left`,
        color: "orange",
      };
    }
    return null;
  };

  const isBelowReorder = (product) => {
    const inventory = product.inventory?.[0];
    if (!inventory) return true;
    const available = parseFloat(inventory.quantity || 0);
    const threshold = inventory.reorderPoint || product.lowStockThreshold || 10;
    return available <= threshold;
  };

  const isExpiringAlert = (product) => {
    const days = daysUntilExpiry(product.expiryDate);
    return days !== null && days <= expiryAlertDays;
  };

  const filteredProducts = useMemo(() => {
    if (stockFilter === "reorder" || stockFilter === "low") {
      return products.filter(isBelowReorder);
    }
    if (stockFilter === "expiring") {
      return products.filter(isExpiringAlert);
    }
    return products;
  }, [products, stockFilter, expiryAlertDays]);

  const filterButtons = [
    { key: "all", label: "All" },
    { key: "reorder", label: "Reorder" },
    { key: "expiring", label: "Expiring" },
  ];

  const badgeClass = (color) =>
    color === "green"
      ? "bg-green-100 text-green-700"
      : color === "orange"
      ? "bg-orange-100 text-orange-700"
      : color === "red"
      ? "bg-red-100 text-red-700"
      : "bg-gray-100 text-gray-600";

  return (
    <div className="pb-4">
      <div className="px-4 py-3 bg-[var(--ios-bg-grouped)]">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="ios-search-input-wrapper flex-1 min-w-[180px]">
            <Search className="ios-search-icon" />
            <input
              type="search"
              placeholder="Search products..."
              className="ios-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className="hidden"
            onChange={handleImportFile}
          />
          <button
            type="button"
            onClick={() => downloadProductImportTemplate()}
            className="ios-btn ios-btn-secondary whitespace-nowrap flex-shrink-0"
            title="Download Excel template"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Template
          </button>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            disabled={importing || bulkImportMutation.isLoading}
            className="ios-btn ios-btn-secondary whitespace-nowrap flex-shrink-0"
          >
            {importing || bulkImportMutation.isLoading ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-1.5" />
            )}
            Import Excel
          </button>
          <button
            type="button"
            onClick={handleAddProduct}
            className="ios-btn ios-btn-primary whitespace-nowrap flex-shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Product
          </button>
        </div>
      </div>

      <div className="px-4 pb-2 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2">
          {filterButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setStockFilter(btn.key)}
              className={`ios-btn-sm whitespace-nowrap ${
                stockFilter === btn.key ||
                (btn.key === "reorder" && stockFilter === "low")
                  ? "bg-teal-600 text-white"
                  : "bg-[var(--ios-gray-5)] text-[var(--ios-text-primary)]"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

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
            All categories
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
          {showNewCategory && !showProductSheet ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                type="text"
                className="ios-btn-sm bg-white border border-[var(--ios-gray-4)] min-w-[140px]"
                placeholder="New category"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategory();
                  }
                }}
              />
              <button
                type="button"
                className="ios-btn-sm bg-teal-600 text-white"
                onClick={addCategory}
                disabled={createCategoryMutation.isLoading}
              >
                Save
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowNewCategory(true);
                setNewCategoryName("");
              }}
              className="ios-btn-sm whitespace-nowrap bg-[var(--ios-gray-5)] text-teal-700"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add
            </button>
          )}
        </div>
      </div>

      {productsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--ios-blue)]" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="ios-empty-state">
          <Package className="ios-empty-state-icon" />
          <h3 className="ios-empty-state-title">No Products</h3>
          <p className="ios-empty-state-message">
            {search || stockFilter !== "all"
              ? "No products match your filters"
              : "Add your first product to get started"}
          </p>
          {stockFilter === "all" && !search && (
            <button
              onClick={handleAddProduct}
              className="ios-btn ios-btn-primary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Product
            </button>
          )}
        </div>
      ) : (
        <div className="ios-section">
          <p className="ios-section-header">
            {filteredProducts.length} Products
          </p>
          <div className="ios-list mx-4">
            {filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product);
              const expiryStatus = getExpiryStatus(product);
              return (
                <div key={product.id} className="ios-list-item w-full text-left">
                  <button
                    type="button"
                    onClick={() => handleEditProduct(product)}
                    className="flex items-center flex-1 min-w-0 text-left"
                  >
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
                    <div className="flex-1 min-w-0 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[17px] font-medium truncate pr-2">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {expiryStatus && (
                            <span
                              className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${badgeClass(
                                expiryStatus.color
                              )}`}
                            >
                              {expiryStatus.status}
                            </span>
                          )}
                          <span
                            className={`text-[13px] font-medium px-2 py-0.5 rounded-full ${badgeClass(
                              stockStatus.color
                            )}`}
                          >
                            {stockStatus.status}
                          </span>
                        </div>
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
                  </button>
                  <button
                    type="button"
                    onClick={(event) => shareProduct(event, product)}
                    className="p-2 rounded-full text-teal-700 hover:bg-teal-50 flex-shrink-0"
                    title="Share on WhatsApp"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-[var(--ios-gray-3)] ml-1 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {products.length > 0 && (
        <button
          onClick={handleAddProduct}
          className="ios-fab"
          style={{ bottom: "calc(var(--tab-bar-height) + 20px)" }}
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {showProductSheet && (
        <>
          <div className="ios-sheet-overlay" onClick={handleCloseSheet} />
          <div className="ios-sheet" style={{ maxHeight: "95vh" }}>
            <div className="ios-sheet-handle" />

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

            <div className="ios-sheet-content px-4 pb-8">
              <form onSubmit={handleSubmit(onSubmit)}>
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
                    {showNewCategory ? (
                      <div className="ios-input-wrapper">
                        <label className="ios-input-label">New category</label>
                        <div className="flex items-center gap-2 w-full">
                          <input
                            autoFocus
                            type="text"
                            className="ios-input"
                            placeholder="e.g. Household"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addCategory();
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="text-[15px] font-semibold text-[var(--ios-blue)] flex-shrink-0"
                            onClick={addCategory}
                            disabled={createCategoryMutation.isLoading}
                          >
                            {createCategoryMutation.isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Add"
                            )}
                          </button>
                          <button
                            type="button"
                            className="text-[15px] text-[var(--ios-gray-1)] flex-shrink-0"
                            onClick={() => {
                              setShowNewCategory(false);
                              setNewCategoryName("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 text-[15px] text-[var(--ios-blue)]"
                        onClick={() => setShowNewCategory(true)}
                      >
                        <span className="flex items-center">
                          <Plus className="w-4 h-4 mr-2" />
                          Add category
                        </span>
                      </button>
                    )}
                  </div>
                </div>

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
                      <label className="ios-input-label">Reorder level</label>
                      <input
                        type="number"
                        min="0"
                        className="ios-input"
                        placeholder="10"
                        {...register("lowStockThreshold")}
                      />
                    </div>
                    <div className="ios-input-wrapper">
                      <label className="ios-input-label">Expiry date</label>
                      <input
                        type="date"
                        className="ios-input"
                        {...register("expiryDate")}
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
                  <p className="ios-section-footer">
                    Alert when stock hits reorder level, or when expiry is within{" "}
                    {expiryAlertDays} days.
                  </p>
                </div>

                <div className="ios-section">
                  <p className="ios-section-header">Description (Optional)</p>
                  <textarea
                    className="ios-textarea mx-0"
                    placeholder="Add product description..."
                    rows={3}
                    {...register("description")}
                  />
                </div>

                <div className="ios-section">
                  <p className="ios-section-header">Storefront</p>
                  <label className="flex items-center justify-between bg-white rounded-xl px-4 py-3">
                    <span>Show in online shop</span>
                    <input type="checkbox" {...register("isOnline")} />
                  </label>
                </div>

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
