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
  ImagePlus,
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
import { productImageSrc } from "../../utils/productImage";

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

const BASE_UNITS = [
  { value: "piece", label: "Pieces" },
  { value: "kg", label: "Kilograms" },
  { value: "g", label: "Grams" },
  { value: "liter", label: "Liters" },
  { value: "ml", label: "Milliliters" },
  { value: "meter", label: "Meters" },
  { value: "cm", label: "Centimeters" },
  { value: "box", label: "Box" },
  { value: "pack", label: "Pack" },
  { value: "dozen", label: "Dozen" },
];

const unitLabel = (value) => {
  const known = BASE_UNITS.find((unit) => unit.value === value);
  if (known) return known.label;
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const formatMoneyInput = (value) => {
  const raw = String(value ?? "").replace(/,/g, "");
  if (raw === "") return "";
  const match = raw.match(/^(\d*)(\.?)(\d{0,2})/);
  if (!match) return "";
  const digits = match[1].replace(/^0+(?=\d)/, "");
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (match[2]) return `${grouped || "0"}.${match[3]}`;
  return grouped;
};

const formatCountInput = (value) => {
  const digits = String(value ?? "")
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const parseAmount = (value) => {
  const n = parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const parseCount = (value) => {
  const n = parseInt(String(value ?? "").replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};

const emptyForm = {
  name: "",
  sku: "",
  categoryId: "",
  costPrice: "",
  sellingPrice: "",
  unit: "piece",
  lowStockThreshold: "10",
  expiryDate: "",
  vatStatus: "Non-Vatable",
  initialStock: "0",
  description: "",
  isOnline: true,
  kind: "product",
  image: "",
  images: [],
};

const isServiceItem = (item) =>
  item?.kind === "service" || item?.trackInventory === false;

const prepareProductImage = (file) =>
  new Promise((resolve, reject) => {
    if (!file?.type?.startsWith("image/")) {
      reject(new Error("Choose an image file"));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const maxEdge = 1600;
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not resize that image"));
            return;
          }
          const baseName = String(file.name || "product").replace(/\.\w+$/, "");
          resolve(new File([blob], `${baseName}.jpg`, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.82
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read that image"));
    };
    img.src = objectUrl;
  });

const productImageList = (item) => {
  const saved = Array.isArray(item?.images) ? item.images : [];
  const urls = saved
    .map((url) => String(url || "").trim())
    .filter((url) => /^https?:\/\//i.test(url));
  const cover = String(item?.image || "").trim();
  if (/^https?:\/\//i.test(cover) && !urls.includes(cover)) urls.unshift(cover);
  return urls.slice(0, 8);
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
    getValues,
  } = useForm({
    defaultValues: emptyForm,
  });
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [customUnits, setCustomUnits] = useState([]);
  const photoInputRef = useRef(null);
  const photoTargetRef = useRef("form");
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [viewProductId, setViewProductId] = useState(null);
  const [viewPhoto, setViewPhoto] = useState(0);

  const costPrice = watch("costPrice");
  const sellingPrice = watch("sellingPrice");
  const selectedUnit = watch("unit");
  const itemKind = watch("kind") === "service" ? "service" : "product";
  const formImages = watch("images") || [];
  const costValue = parseAmount(costPrice);
  const sellValue = parseAmount(sellingPrice);
  const profitMargin =
    sellValue > 0 ? (((sellValue - costValue) / sellValue) * 100).toFixed(1) : 0;

  const { data: productsData, isLoading: productsLoading } = useQuery(
    ["products", { search, categoryFilter }],
    () =>
      api.products.list({
        search,
        category: categoryFilter || undefined,
        status: "all",
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
  const viewedProduct =
    products.find((product) => product.id === viewProductId) || null;
  const categories = categoriesData?.data?.categories || [];
  const unitOptions = useMemo(() => {
    const options = new Map(BASE_UNITS.map((unit) => [unit.value, unit.label]));
    products.forEach((product) => {
      const value = String(product.unit || "").trim();
      if (value && !options.has(value)) options.set(value, unitLabel(value));
    });
    customUnits.forEach((unit) => {
      if (unit.value && !options.has(unit.value)) options.set(unit.value, unit.label);
    });
    const current = String(selectedUnit || "").trim();
    if (current && !options.has(current)) options.set(current, unitLabel(current));
    return [...options.entries()].map(([value, label]) => ({ value, label }));
  }, [products, customUnits, selectedUnit]);
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
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries("products");
        if (variables?.imageOnly) {
          toast.success("Image saved");
          return;
        }
        if (variables?.statusOnly) {
          toast.success(
            variables.data?.status === "inactive"
              ? "Product disabled"
              : "Product enabled"
          );
          return;
        }
        toast.success("Product updated successfully!");
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

  const addUnit = () => {
    const label = newUnitName.trim();
    if (label.length < 2) {
      toast.error("Enter a unit name");
      return;
    }
    const known = BASE_UNITS.find(
      (unit) =>
        unit.value === label.toLowerCase() ||
        unit.label.toLowerCase() === label.toLowerCase()
    );
    const value = known ? known.value : label.slice(0, 30);
    if (!known) {
      setCustomUnits((current) =>
        current.some((unit) => unit.value.toLowerCase() === value.toLowerCase())
          ? current
          : [...current, { value, label: value }]
      );
    }
    setValue("unit", value);
    setNewUnitName("");
    setShowNewUnit(false);
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
    setShowNewUnit(false);
    setNewUnitName("");
    reset(emptyForm);
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setShowNewCategory(false);
    setNewCategoryName("");
    setShowNewUnit(false);
    setNewUnitName("");
    reset(emptyForm);
    setShowProductSheet(true);
  };

  const handleEditProduct = (product) => {
    setViewProductId(null);
    setSelectedProduct(product);
    reset({
      name: product.name || "",
      sku: product.sku || "",
      categoryId: product.categoryId || "",
      costPrice: formatMoneyInput(product.costPrice || ""),
      sellingPrice: formatMoneyInput(product.sellingPrice || ""),
      unit: product.unit || "piece",
      lowStockThreshold: formatCountInput(product.lowStockThreshold ?? 10),
      expiryDate: toDateInput(product.expiryDate),
      vatStatus: product.vatStatus || "Non-Vatable",
      initialStock: formatCountInput(product.inventory?.[0]?.quantity || 0),
      description: product.description || "",
      isOnline: product.isOnline !== false,
      kind: isServiceItem(product) ? "service" : "product",
      image: productImageList(product)[0] || "",
      images: productImageList(product),
    });
    setShowProductSheet(true);
  };

  const setProductEnabled = (product, enabled) => {
    if (
      !enabled &&
      !window.confirm(
        "Disable this product? It will be hidden from sales and the shop until you enable it."
      )
    ) {
      return;
    }
    updateProductMutation.mutate({
      id: product.id,
      data: { status: enabled ? "active" : "inactive" },
      statusOnly: true,
    });
  };

  const openProduct = (product) => {
    setViewPhoto(0);
    setViewProductId(product.id);
  };

  const openPhotoPicker = (target) => {
    photoTargetRef.current = target;
    photoInputRef.current?.click();
  };

  const handlePhotoFile = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    const imagesOnly = files.filter((file) => file.type.startsWith("image/"));
    if (!imagesOnly.length) {
      toast.error("Choose an image file");
      return;
    }
    if (imagesOnly.some((file) => file.size > 15 * 1024 * 1024)) {
      toast.error("Each image must be 15MB or smaller");
      return;
    }
    setUploadingPhotos(true);
    try {
      const prepared = await Promise.all(imagesOnly.slice(0, 8).map(prepareProductImage));
      const response = await api.products.uploadImages(prepared);
      const urls = response?.data?.urls || [];
      if (!urls.length) throw new Error("Upload did not return an image");
      const target = photoTargetRef.current;
      if (target && target !== "form") {
        const product = products.find((item) => item.id === target);
        const next = [...productImageList(product), ...urls].slice(0, 8);
        updateProductMutation.mutate({
          id: target,
          data: { images: next, image: next[0] || null },
          imageOnly: true,
        });
        return;
      }
      const next = [...(getValues("images") || []), ...urls].slice(0, 8);
      setValue("images", next, { shouldDirty: true });
      setValue("image", next[0] || "", { shouldDirty: true });
    } catch (error) {
      if (!error?.status) {
        toast.error(error.message || "Could not upload images");
      }
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removeFormImage = (index) => {
    const next = (getValues("images") || []).filter((_, itemIndex) => itemIndex !== index);
    setValue("images", next, { shouldDirty: true });
    setValue("image", next[0] || "", { shouldDirty: true });
  };

  const onSubmit = (data) => {
    const service = data.kind === "service";
    const productData = {
      name: data.name,
      sku: data.sku || undefined,
      categoryId: data.categoryId || null,
      costPrice: parseAmount(data.costPrice),
      sellingPrice: parseAmount(data.sellingPrice),
      unit: String(data.unit || "piece").trim().slice(0, 30) || "piece",
      lowStockThreshold: service
        ? 0
        : String(data.lowStockThreshold ?? "").trim() === ""
          ? 10
          : parseCount(data.lowStockThreshold),
      expiryDate: service ? null : data.expiryDate || null,
      vatStatus: data.vatStatus || "Non-Vatable",
      openingStock: service ? 0 : parseCount(data.initialStock),
      description: data.description || "",
      isOnline: Boolean(data.isOnline),
      kind: service ? "service" : "product",
      trackInventory: !service,
      images: Array.isArray(data.images) ? data.images : [],
      image: (Array.isArray(data.images) ? data.images[0] : data.image) || null,
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
    if (isServiceItem(product)) return { status: "Service", color: "teal" };
    const inventory = product.inventory?.[0];
    if (!inventory) return { status: "No Stock", color: "gray" };
    const available = parseFloat(inventory.quantity || 0);
    const threshold = inventory.reorderPoint || product.lowStockThreshold || 10;
    if (available <= 0) return { status: "Out", color: "red" };
    if (available <= threshold) return { status: "Reorder", color: "orange" };
    return { status: `${available}`, color: "green" };
  };

  const getExpiryStatus = (product) => {
    if (isServiceItem(product)) return null;
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
    if (isServiceItem(product)) return false;
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
    if (stockFilter === "disabled") {
      return products.filter((product) => product.status === "inactive");
    }
    const enabled = products.filter((product) => product.status !== "inactive");
    if (stockFilter === "reorder" || stockFilter === "low") {
      return enabled.filter(isBelowReorder);
    }
    if (stockFilter === "expiring") {
      return enabled.filter(isExpiringAlert);
    }
    return enabled;
  }, [products, stockFilter, expiryAlertDays]);

  const filterButtons = [
    { key: "all", label: "All" },
    { key: "reorder", label: "Reorder" },
    { key: "expiring", label: "Expiring" },
    { key: "disabled", label: "Disabled" },
  ];

  const badgeClass = (color) =>
    color === "green"
      ? "bg-green-100 text-green-700"
      : color === "orange"
      ? "bg-orange-100 text-orange-700"
      : color === "red"
      ? "bg-red-100 text-red-700"
      : color === "teal"
      ? "bg-teal-100 text-teal-800"
      : "bg-gray-100 text-gray-600";

  return (
    <div className="pb-4">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handlePhotoFile}
      />
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
              const photos = productImageList(product);
              return (
                <div key={product.id} className="ios-list-item w-full text-left">
                  <button
                    type="button"
                    onClick={() => openPhotoPicker(product.id)}
                    disabled={uploadingPhotos}
                    className="relative w-12 h-12 rounded-xl bg-[var(--ios-gray-6)] flex items-center justify-center mr-3 flex-shrink-0 overflow-hidden"
                    title="Add images"
                  >
                    {photos[0] ? (
                      <img
                        src={productImageSrc(photos[0], "thumb")}
                        alt={product.name}
                        width={48}
                        height={48}
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="w-5 h-5 text-[var(--ios-gray-2)]" />
                    )}
                    {photos.length > 1 && (
                      <span className="absolute bottom-0.5 right-0.5 text-[10px] font-semibold bg-black/70 text-white rounded px-1">
                        {photos.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => openProduct(product)}
                    className="flex items-center flex-1 min-w-0 text-left"
                  >
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
                              product.status === "inactive" ? "gray" : stockStatus.color
                            )}`}
                          >
                            {product.status === "inactive" ? "Disabled" : stockStatus.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1 gap-2">
                        <div className="min-w-0">
                          <p className="text-[15px] text-[var(--ios-gray-1)]">
                            {formatCurrency(product.sellingPrice)}
                          </p>
                          {product.description ? (
                            <p className="text-[13px] text-[var(--ios-gray-2)] truncate">
                              {product.description}
                            </p>
                          ) : null}
                        </div>
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

      {viewedProduct && !showProductSheet && (
        <>
          <div className="ios-sheet-overlay" onClick={() => setViewProductId(null)} />
          <div className="ios-sheet" style={{ maxHeight: "95vh" }}>
            <div className="ios-sheet-handle" />
            <div className="ios-sheet-header">
              <button
                type="button"
                onClick={() => setViewProductId(null)}
                className="text-[17px] text-[var(--ios-blue)]"
              >
                Close
              </button>
              <h3 className="ios-sheet-title truncate px-2">{viewedProduct.name}</h3>
              <button
                type="button"
                onClick={() => handleEditProduct(viewedProduct)}
                className="text-[17px] font-semibold text-[var(--ios-blue)]"
              >
                Edit
              </button>
            </div>
            <div className="ios-sheet-content px-4 pb-8">
              {(() => {
                const photos = productImageList(viewedProduct);
                const photoIndex = Math.min(viewPhoto, Math.max(photos.length - 1, 0));
                const cover = photos[photoIndex];
                const inventory = viewedProduct.inventory?.[0];
                const onHand = inventory ? parseFloat(inventory.quantity || 0) : null;
                const service = isServiceItem(viewedProduct);
                const rows = [
                  ["Type", service ? "Service" : "Product"],
                  ["SKU", viewedProduct.sku],
                  ["Category", viewedProduct.category?.name],
                  ["Unit", unitLabel(viewedProduct.unit)],
                  ["Cost price", formatCurrency(viewedProduct.costPrice || 0)],
                  ["Selling price", formatCurrency(viewedProduct.sellingPrice || 0)],
                  ["VAT", viewedProduct.vatStatus],
                  service ? null : ["In stock", onHand == null ? "—" : String(onHand)],
                  service ? null : ["Reorder level", viewedProduct.lowStockThreshold ?? "—"],
                  service || !viewedProduct.expiryDate
                    ? null
                    : ["Expiry", toDateInput(viewedProduct.expiryDate)],
                  ["Online shop", viewedProduct.isOnline === false ? "Hidden" : "Shown"],
                ].filter(Boolean);
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => openPhotoPicker(viewedProduct.id)}
                      className="w-full h-56 rounded-2xl bg-[var(--ios-gray-6)] overflow-hidden flex items-center justify-center"
                    >
                      {cover ? (
                        <img
                          src={productImageSrc(cover, "preview")}
                          alt={viewedProduct.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="flex flex-col items-center text-[var(--ios-gray-1)]">
                          <ImagePlus className="w-8 h-8 mb-2" />
                          Add images
                        </span>
                      )}
                    </button>
                    {photos.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto mt-3">
                        {photos.map((url, index) => (
                          <button
                            key={`${url}-${index}`}
                            type="button"
                            onClick={() => setViewPhoto(index)}
                            className={`w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ${
                              index === photoIndex ? "ring-2 ring-teal-700" : ""
                            }`}
                          >
                            <img
                              src={productImageSrc(url, "thumb")}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mt-4">
                      <p className="text-[22px] font-semibold">{viewedProduct.name}</p>
                      <p className="text-[17px] text-teal-700 font-semibold mt-1">
                        {formatCurrency(viewedProduct.sellingPrice || 0)}
                      </p>
                    </div>
                    <div className="ios-section">
                      <p className="ios-section-header">Description</p>
                      <p className="bg-white rounded-xl px-4 py-3 text-[15px] whitespace-pre-wrap">
                        {viewedProduct.description || "No description yet. Tap Edit to add one."}
                      </p>
                    </div>
                    <div className="ios-section">
                      <p className="ios-section-header">Details</p>
                      <div className="ios-list mx-0">
                        {rows.map(([label, value]) => (
                          <div key={label} className="ios-input-wrapper">
                            <span className="ios-input-label">{label}</span>
                            <span className="text-[17px] text-right">{value || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button
                        type="button"
                        onClick={() => handleEditProduct(viewedProduct)}
                        className="ios-btn ios-btn-primary justify-center"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setProductEnabled(
                            viewedProduct,
                            viewedProduct.status === "inactive"
                          )
                        }
                        disabled={updateProductMutation.isLoading}
                        className="ios-btn justify-center"
                        style={
                          viewedProduct.status === "inactive"
                            ? { backgroundColor: "#0f766e", color: "#fff" }
                            : {
                                color: "var(--ios-red)",
                                backgroundColor: "rgba(255, 59, 48, 0.1)",
                              }
                        }
                      >
                        {viewedProduct.status === "inactive" ? "Enable" : "Disable"}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </>
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
                {selectedProduct
                  ? itemKind === "service"
                    ? "Edit Service"
                    : "Edit Product"
                  : itemKind === "service"
                    ? "New Service"
                    : "New Product"}
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
                  <p className="ios-section-header">Type</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "product", label: "Product" },
                      { value: "service", label: "Service" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setValue("kind", option.value, { shouldDirty: true })
                        }
                        className={`rounded-xl py-3 text-[15px] font-semibold ${
                          itemKind === option.value
                            ? "bg-teal-700 text-white"
                            : "bg-white text-[var(--ios-label)]"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ios-section">
                  <p className="ios-section-header">Photos</p>
                  <div className="bg-white rounded-xl px-4 py-3">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {formImages.map((url, index) => (
                        <div key={`${url}-${index}`} className="relative flex-shrink-0">
                          <img
                            src={productImageSrc(url, "preview")}
                            alt=""
                            width={64}
                            height={64}
                            decoding="async"
                            className="w-16 h-16 rounded-xl object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeFormImage(index)}
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/70 text-white text-[12px] leading-none"
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => openPhotoPicker("form")}
                        disabled={uploadingPhotos}
                        className="w-16 h-16 rounded-xl bg-[var(--ios-gray-6)] flex items-center justify-center flex-shrink-0"
                      >
                        {uploadingPhotos ? (
                          <Loader2 className="w-5 h-5 animate-spin text-[var(--ios-gray-2)]" />
                        ) : (
                          <ImagePlus className="w-6 h-6 text-[var(--ios-gray-2)]" />
                        )}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => openPhotoPicker("form")}
                      disabled={uploadingPhotos}
                      className="text-[15px] font-semibold text-[var(--ios-blue)]"
                    >
                      {uploadingPhotos ? "Uploading…" : "Add images"}
                    </button>
                    <p className="text-[13px] text-[var(--ios-gray-1)] mt-1">
                      Add more than one. Photos are resized automatically, and the first one is the cover.
                    </p>
                  </div>
                </div>

                <div className="ios-section">
                  <p className="ios-section-header">Description</p>
                  <textarea
                    className="ios-textarea mx-0"
                    placeholder="What is this, and what should the customer know?"
                    rows={3}
                    {...register("description")}
                  />
                </div>

                <div className="ios-section">
                  <p className="ios-section-header">
                    {itemKind === "service" ? "Service Details" : "Product Details"}
                  </p>
                  <div className="ios-list mx-0">
                    <div className="ios-input-wrapper">
                      <label className="ios-input-label">Name</label>
                      <input
                        type="text"
                        className="ios-input"
                      placeholder={itemKind === "service" ? "Service name" : "Product name"}
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
                        type="text"
                        inputMode="decimal"
                        className="ios-input"
                        placeholder="₦0.00"
                        value={formatMoneyInput(costPrice)}
                        onChange={(e) =>
                          setValue("costPrice", formatMoneyInput(e.target.value), {
                            shouldDirty: true,
                          })
                        }
                      />
                    </div>
                    <div className="ios-input-wrapper">
                      <label className="ios-input-label">Selling Price</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="ios-input"
                        placeholder="₦0.00"
                        value={formatMoneyInput(sellingPrice)}
                        onChange={(e) =>
                          setValue("sellingPrice", formatMoneyInput(e.target.value), {
                            shouldDirty: true,
                          })
                        }
                      />
                    </div>
                    <div className="ios-input-wrapper">
                      <label className="ios-input-label">VAT</label>
                      <select className="ios-input bg-transparent" {...register("vatStatus")}>
                        <option value="Non-Vatable">Non-vatable</option>
                        <option value="Vatable">Vatable</option>
                        <option value="Zero-rated">Zero-rated</option>
                        <option value="Exempted">Exempted</option>
                      </select>
                    </div>
                  </div>
                  {costValue > 0 && sellValue > 0 && (
                    <p className="ios-section-footer">
                      Profit: {formatCurrency(sellValue - costValue)} (
                      {profitMargin}% margin)
                    </p>
                  )}
                </div>

                <div className="ios-section">
                  <p className="ios-section-header">
                    {itemKind === "service" ? "Unit" : "Inventory"}
                  </p>
                  <div className="ios-list mx-0">
                    <div className="ios-input-wrapper">
                      <label className="ios-input-label">Unit</label>
                      <select
                        className="ios-input bg-transparent"
                        {...register("unit")}
                      >
                        {unitOptions.map((unit) => (
                          <option key={unit.value} value={unit.value}>
                            {unit.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {showNewUnit ? (
                      <div className="ios-input-wrapper">
                        <label className="ios-input-label">New unit</label>
                        <div className="flex items-center gap-2 w-full">
                          <input
                            autoFocus
                            type="text"
                            className="ios-input"
                            placeholder="e.g. Carton"
                            value={newUnitName}
                            onChange={(e) => setNewUnitName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addUnit();
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="text-[15px] font-semibold text-[var(--ios-blue)] flex-shrink-0"
                            onClick={addUnit}
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            className="text-[15px] text-[var(--ios-gray-1)] flex-shrink-0"
                            onClick={() => {
                              setShowNewUnit(false);
                              setNewUnitName("");
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
                        onClick={() => setShowNewUnit(true)}
                      >
                        <span className="flex items-center">
                          <Plus className="w-4 h-4 mr-2" />
                          Add unit
                        </span>
                      </button>
                    )}
                    {itemKind !== "service" && (
                      <>
                    <div className="ios-input-wrapper">
                      <label className="ios-input-label">Reorder level</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="ios-input"
                        placeholder="10"
                        value={formatCountInput(watch("lowStockThreshold"))}
                        onChange={(e) =>
                          setValue(
                            "lowStockThreshold",
                            formatCountInput(e.target.value),
                            { shouldDirty: true }
                          )
                        }
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
                          type="text"
                          inputMode="numeric"
                          className="ios-input"
                          placeholder="0"
                          value={formatCountInput(watch("initialStock"))}
                          onChange={(e) =>
                            setValue("initialStock", formatCountInput(e.target.value), {
                              shouldDirty: true,
                            })
                          }
                        />
                      </div>
                    )}
                      </>
                    )}
                  </div>
                  <p className="ios-section-footer">
                    {itemKind === "service"
                      ? "Services are sold without reducing stock."
                      : `Alert when stock hits reorder level, or when expiry is within ${expiryAlertDays} days.`}
                  </p>
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
