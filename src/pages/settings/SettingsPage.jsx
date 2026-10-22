import React, { useEffect, useRef, useState } from "react";
import {
  Settings,
  Building2,
  User,
  Bell,
  Monitor,
  Shield,
  Download,
  Upload,
  Database,
  Info,
  AlertTriangle,
  Save,
  Moon,
  Sun,
  Globe,
  DollarSign,
  Receipt,
  Percent,
  FileText,
  Archive,
  RotateCcw,
  Check,
  X,
  Landmark,
  Plus,
  Trash2,
  Star,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { selectUser } from "../../store/slices/authSlice";
import {
  PAPER_FORMATS,
  ORIENTATIONS,
  COLOR_MODES,
  getDocPrintSettings,
} from "../../utils/salesDocuments";

const emptyProfile = {
  name: "",
  businessType: "retail",
  phones: [""],
  email: "",
  website: "",
  address: "",
  city: "",
  state: "",
  description: "",
  registrationNumber: "",
  logo: "",
};

const emptyBankDraft = {
  bankName: "",
  accountName: "",
  accountNumber: "",
};

const SettingsPage = () => {
  const user = useSelector(selectUser);
  const canManageSettings =
    user?.role === "owner" ||
    (user?.permissions || []).includes("settings.manage");

  const [activeTab, setActiveTab] = useState("business");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [profileDraft, setProfileDraft] = useState(emptyProfile);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const profileDirty = useRef(false);
  const logoInputRef = useRef(null);
  const [bankDraft, setBankDraft] = useState(emptyBankDraft);
  const [editingBankId, setEditingBankId] = useState(null);
  const [invoicePreviewUrl, setInvoicePreviewUrl] = useState("");
  const [waybillPreviewUrl, setWaybillPreviewUrl] = useState("");
  const [footerDraft, setFooterDraft] = useState(null);
  const [waybillFooterDraft, setWaybillFooterDraft] = useState(null);

  const queryClient = useQueryClient();

  // Fetch settings
  const {
    data: settingsData,
    isLoading: settingsLoading,
    refetch: refetchSettings,
  } = useQuery("settings", api.settings.get, {
    refetchOnWindowFocus: false,
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Fetch system info
  const { data: systemData, isLoading: systemLoading } = useQuery(
    "system-info",
    api.settings.systemInfo,
    {
      refetchOnWindowFocus: false,
    }
  );

  const settings = settingsData?.data || {};
  const savedFooter = settings.business?.receiptSettings?.footerText ?? "";
  const footerText = footerDraft ?? savedFooter;
  const savedWaybillFooter =
    settings.business?.receiptSettings?.waybillFooterText ?? "";
  const waybillFooterText = waybillFooterDraft ?? savedWaybillFooter;
  const invoicePrint = getDocPrintSettings(settings.business, "invoice");
  const waybillPrint = getDocPrintSettings(settings.business, "waybill");
  const invoiceEnabled =
    settings.business?.receiptSettings?.includeInvoice !== false;
  const waybillEnabled =
    settings.business?.receiptSettings?.includeWaybill !== false;
  const systemInfo = systemData?.data || {};
  const bankAccounts =
    settings.bankAccounts || settings.business?.bankAccounts || [];

  const sampleSaleForPreview = (business) => ({
    saleNumber: "SAMPLE",
    date: new Date().toISOString(),
    customer: { name: "Sample customer", phone: "08000000000", code: "CUS-0001" },
    cashierName: "Staff",
    paymentMethod: "cash",
    paymentStatus: "paid",
    subtotal: 3000,
    taxAmount: business.taxEnabled
      ? 3000 * (Number(business.taxRate || 0) / 100)
      : 0,
    total: business.taxEnabled
      ? 3000 * (1 + Number(business.taxRate || 0) / 100)
      : 3000,
    paidAmount: business.taxEnabled
      ? 3000 * (1 + Number(business.taxRate || 0) / 100)
      : 3000,
    items: [
      {
        quantity: 2,
        unitPrice: 1500,
        totalPrice: 3000,
        product: { name: "Sample product", unit: "pcs" },
      },
    ],
  });

  const patchReceiptDoc = (kind, patch) => {
    const receipt = settings.business?.receiptSettings || {};
    const current = getDocPrintSettings(settings.business, kind);
    handleBusinessSettingChange("settings", {
      receiptSettings: {
        ...receipt,
        [kind]: {
          ...current,
          ...(receipt[kind] || {}),
          ...patch,
        },
      },
    });
  };

  const formatPreviewLabel = (print) => {
    const paper =
      PAPER_FORMATS.find((item) => item.id === print.paperFormat)?.label ||
      "A4";
    if (print.paperFormat === "thermal") return paper;
    const orient =
      ORIENTATIONS.find((o) => o.id === print.orientation)?.label ||
      "Portrait";
    const color =
      COLOR_MODES.find((c) => c.id === print.colorMode)?.label || "Color";
    return `${paper} · ${orient} · ${color}`;
  };

  useEffect(() => {
    if (!settings.business) return;
    if (profileDirty.current) return;
    const savedPhones = [
      ...(Array.isArray(settings.business.phones) ? settings.business.phones : []),
      settings.business.phone,
      settings.profile?.phone,
    ]
      .flatMap((phone) => String(phone || "").split(/[\n,;/|]+/))
      .map((phone) => phone.trim())
      .filter((phone, index, all) => phone && all.indexOf(phone) === index);
    let remembered = {};
    try {
      remembered = JSON.parse(
        sessionStorage.getItem(`sakora-profile-place-${settings.business.id}`) ||
          "{}"
      );
    } catch {
      remembered = {};
    }
    setProfileDraft((prev) => ({
      name: settings.business.name || "",
      businessType: settings.business.businessType || "retail",
      phones: savedPhones.length ? savedPhones : [""],
      email: settings.business.email || settings.profile?.email || "",
      website: settings.business.website || "",
      address:
        settings.business.address || remembered.address || prev?.address || "",
      city: settings.business.city || remembered.city || prev?.city || "",
      state: settings.business.state || remembered.state || prev?.state || "",
      description: settings.business.description || "",
      registrationNumber:
        settings.business.registrationNumber ||
        settings.business.registration_number ||
        "",
      logo: settings.business.logo || prev?.logo || "",
    }));
  }, [settings.business, settings.profile]);

  const readLogoFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 512;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      setProfileDraft((prev) => ({
        ...prev,
        logo: canvas.toDataURL("image/jpeg", 0.85),
      }));
      setLogoRemoved(false);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Could not read that image");
    };
    img.src = url;
  };

  useEffect(() => {
    if (!settings.business?.id) return;
    const place = {
      address: String(profileDraft.address || "").trim(),
      city: String(profileDraft.city || "").trim(),
      state: String(profileDraft.state || "").trim(),
    };
    if (!place.address && !place.city && !place.state) return;
    sessionStorage.setItem(
      `sakora-profile-place-${settings.business.id}`,
      JSON.stringify(place)
    );
  }, [
    settings.business?.id,
    profileDraft.address,
    profileDraft.city,
    profileDraft.state,
  ]);

  useEffect(() => {
    const business = settings.business;
    if (!business) return undefined;
    const draftPhones = (profileDraft.phones || [])
      .map((phone) => String(phone || "").trim())
      .filter(Boolean);
    const previewBusiness = {
      ...business,
      name: profileDraft.name || business.name,
      description: profileDraft.description || business.description,
      address: profileDraft.address || business.address,
      city: profileDraft.city || business.city,
      state: profileDraft.state || business.state,
      email: profileDraft.email || business.email,
      registrationNumber:
        profileDraft.registrationNumber || business.registrationNumber,
      logo: profileDraft.logo || business.logo,
      phones: draftPhones.length ? draftPhones : business.phones,
      phone: draftPhones[0] || business.phone,
      receiptSettings: {
        ...(business.receiptSettings || {}),
        footerText,
        waybillFooterText,
      },
    };

    let cancelled = false;
    (async () => {
      const { getSalesInvoiceBlobUrl, getSalesWaybillBlobUrl } = await import(
        "../../utils/salesDocuments"
      );
      if (cancelled) return;

      const sampleSale = sampleSaleForPreview(previewBusiness);
      if (invoiceEnabled) {
        setInvoicePreviewUrl(
          getSalesInvoiceBlobUrl({
            business: previewBusiness,
            sale: sampleSale,
            format: invoicePrint.paperFormat,
            orientation: invoicePrint.orientation,
            colorMode: invoicePrint.colorMode,
          })
        );
      } else {
        setInvoicePreviewUrl("");
      }

      if (waybillEnabled) {
        setWaybillPreviewUrl(
          getSalesWaybillBlobUrl({
            business: previewBusiness,
            sale: sampleSale,
            format: waybillPrint.paperFormat,
            orientation: waybillPrint.orientation,
            colorMode: waybillPrint.colorMode,
          })
        );
      } else {
        setWaybillPreviewUrl("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    settings.business,
    profileDraft,
    invoicePrint.paperFormat,
    invoicePrint.orientation,
    invoicePrint.colorMode,
    waybillPrint.paperFormat,
    waybillPrint.orientation,
    waybillPrint.colorMode,
    invoiceEnabled,
    waybillEnabled,
    footerText,
    waybillFooterText,
  ]);

  // Update business settings
  const updateBusinessMutation = useMutation(api.settings.updateBusiness, {
    onSuccess: (_data, variables) => {
      if (variables?.phones) profileDirty.current = false;
      toast.success("Business settings updated successfully");
      refetchSettings();
    },
    onError: (error) => {
      toast.error(error.message || error.response?.data?.message || "Failed to update settings");
    },
  });

  // Update user preferences
  const updatePreferencesMutation = useMutation(
    api.settings.updatePreferences,
    {
      onSuccess: () => {
        toast.success("Preferences updated successfully");
        refetchSettings();
      },
      onError: (error) => {
        toast.error(
          error.response?.data?.message || "Failed to update preferences"
        );
      },
    }
  );

  // Export data
  const exportData = async (type) => {
    try {
      const response = await api.settings.exportData(type);
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_export_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`${type} data exported successfully`);
    } catch (error) {
      toast.error(`Failed to export ${type} data`);
    }
  };

  // Create backup
  const createBackup = async () => {
    try {
      const response = await api.settings.backup();
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Backup created successfully");
    } catch (error) {
      toast.error("Failed to create backup");
    }
  };

  // Reset business data
  const resetBusinessData = async () => {
    if (resetConfirmText !== "DELETE ALL DATA") {
      toast.error("Please type 'DELETE ALL DATA' to confirm");
      return;
    }

    try {
      await api.settings.reset({ confirmText: resetConfirmText });
      toast.success("All business data has been reset");
      setShowResetConfirm(false);
      setResetConfirmText("");
      queryClient.invalidateQueries();
    } catch (error) {
      toast.error("Failed to reset business data");
    }
  };

  const handleBusinessSettingChange = (field, value) => {
    if (!canManageSettings) {
      toast.error(
        "Only an owner or manager can change business settings. Ask them to update this, or grant you Settings access."
      );
      return;
    }

    const updatedSettings = {
      [field]: value,
    };

    if (field === "settings") {
      updatedSettings.settings = value;
    }

    updateBusinessMutation.mutate(updatedSettings);
  };

  const handlePreferenceChange = (category, field, value) => {
    const updatedPreferences = {
      [category]: {
        ...settings[category],
        [field]: value,
      },
    };

    updatePreferencesMutation.mutate({ preferences: updatedPreferences });
  };

  const saveBankAccounts = (accounts) => {
    if (!canManageSettings) {
      toast.error(
        "Only an owner or manager can manage bank accounts. Ask them to add banks, or grant you Settings access."
      );
      return;
    }
    updateBusinessMutation.mutate({
      settings: { bankAccounts: accounts },
    });
  };

  const resetBankForm = () => {
    setBankDraft(emptyBankDraft);
    setEditingBankId(null);
  };

  const handleSaveBank = () => {
    const bankName = bankDraft.bankName.trim();
    const accountName = bankDraft.accountName.trim();
    const accountNumber = bankDraft.accountNumber.replace(/\s+/g, "").trim();
    if (!bankName || !accountName || !accountNumber) {
      toast.error("Bank name, account name, and account number are required");
      return;
    }
    if (!/^\d{8,20}$/.test(accountNumber)) {
      toast.error("Enter a valid account number (8–20 digits)");
      return;
    }

    let next;
    if (editingBankId) {
      next = bankAccounts.map((bank) =>
        bank.id === editingBankId
          ? { ...bank, bankName, accountName, accountNumber }
          : bank
      );
    } else {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `bank-${Date.now()}`;
      next = [
        ...bankAccounts,
        {
          id,
          bankName,
          accountName,
          accountNumber,
          isDefault: bankAccounts.length === 0,
        },
      ];
    }
    saveBankAccounts(next);
    resetBankForm();
  };

  const handleSetDefaultBank = (id) => {
    saveBankAccounts(
      bankAccounts.map((bank) => ({
        ...bank,
        isDefault: bank.id === id,
      }))
    );
  };

  const handleDeleteBank = (id) => {
    const remaining = bankAccounts.filter((bank) => bank.id !== id);
    if (remaining.length && !remaining.some((bank) => bank.isDefault)) {
      remaining[0].isDefault = true;
    }
    saveBankAccounts(remaining);
    if (editingBankId === id) resetBankForm();
    if (settings.pos?.defaultBankAccountId === id) {
      handlePreferenceChange(
        "pos",
        "defaultBankAccountId",
        remaining[0]?.id || null
      );
    }
  };

  const tabs = [
    {
      key: "business",
      name: "Business",
      icon: Building2,
      description: "Company settings and configuration",
    },
    {
      key: "preferences",
      name: "Preferences",
      icon: User,
      description: "Personal settings and preferences",
    },
    {
      key: "notifications",
      name: "Notifications",
      icon: Bell,
      description: "Alert and notification settings",
    },
    {
      key: "data",
      name: "Data & Export",
      icon: Download,
      description: "Export, backup, and data management",
    },
    {
      key: "system",
      name: "System",
      icon: Info,
      description: "System information and maintenance",
    },
  ];

  const exportOptions = [
    {
      key: "products",
      name: "Products",
      description: "Export product catalog and inventory",
    },
    {
      key: "sales",
      name: "Sales",
      description: "Export sales transactions and receipts",
    },
    {
      key: "purchases",
      name: "Purchases",
      description: "Export purchase orders and supplier data",
    },
    {
      key: "expenses",
      name: "Expenses",
      description: "Export expense records and categories",
    },
    {
      key: "customers",
      name: "Customers",
      description: "Export customer database and transactions",
    },
    {
      key: "suppliers",
      name: "Suppliers",
      description: "Export supplier information and history",
    },
  ];

  if (settingsLoading || systemLoading) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="lg:col-span-3 h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your business settings, preferences, and data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-colors ${
                      activeTab === tab.key
                        ? "bg-primary-100 text-primary-700 border-l-4 border-primary-500"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    <div>
                      <div className="font-medium">{tab.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {tab.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Business Settings */}
          {activeTab === "business" && (
            <div className="space-y-6">
              <div
                className="card p-6"
                onChange={() => {
                  profileDirty.current = true;
                }}
              >
                <div className="flex items-center justify-between mb-4 gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Business profile
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Used on receipts, invoices, and your shop
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={
                      !profileDraft || updateBusinessMutation.isLoading
                    }
                    onClick={() => {
                      if (!profileDraft?.name?.trim()) {
                        toast.error("Business name is required");
                        return;
                      }
                      const phones = (profileDraft.phones || [])
                        .flatMap((phone) => String(phone || "").split(/[\n,;/|]+/))
                        .map((phone) => phone.trim())
                        .filter((phone, index, all) => phone && all.indexOf(phone) === index);
                      const website = String(profileDraft.website || "").trim();
                      const payload = {
                        ...profileDraft,
                        phones,
                        phone: phones[0] || "",
                        address: String(profileDraft.address || "").trim(),
                        city: String(profileDraft.city || "").trim(),
                        state: String(profileDraft.state || "").trim(),
                        website:
                          !website || /^https?:\/?\/?$/i.test(website) ? "" : website,
                      };
                      if (!payload.logo && !logoRemoved) delete payload.logo;
                      updateBusinessMutation.mutate(payload);
                    }}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save profile
                  </button>
                </div>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-24 h-24 rounded-xl border border-gray-200 dark:border-gray-700 bg-white overflow-hidden flex items-center justify-center shrink-0">
                    {profileDraft?.logo ? (
                      <img
                        src={profileDraft.logo}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Building2 className="w-7 h-7 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        readLogoFile(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => logoInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {profileDraft?.logo ? "Change logo" : "Add logo"}
                      </button>
                      {profileDraft?.logo ? (
                        <button
                          type="button"
                          className="text-sm text-gray-500 hover:text-red-600"
                          onClick={() => {
                            profileDirty.current = true;
                            setLogoRemoved(true);
                            setProfileDraft((prev) => ({ ...prev, logo: "" }));
                          }}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG or JPG. Shown in the app, on receipts, and on your shop.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Business name
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={profileDraft?.name || ""}
                      onChange={(e) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Your business name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Business type
                    </label>
                    <select
                      className="form-select"
                      value={profileDraft?.businessType || "retail"}
                      onChange={(e) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          businessType: e.target.value,
                        }))
                      }
                    >
                      <option value="retail">Retail</option>
                      <option value="wholesale">Wholesale</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="pharmacy">Pharmacy</option>
                      <option value="supermarket">Supermarket</option>
                      <option value="fashion">Fashion</option>
                      <option value="electronics">Electronics</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Business number
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={profileDraft?.registrationNumber || ""}
                      onChange={(e) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          registrationNumber: e.target.value,
                        }))
                      }
                      placeholder="RC, BN, or registration number"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone numbers
                    </label>
                    <div className="space-y-2">
                      {(profileDraft?.phones || [""]).map((phone, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="tel"
                            className="form-input"
                            value={phone}
                            onChange={(e) =>
                              setProfileDraft((prev) => {
                                const phones = [...(prev.phones || [""])];
                                phones[index] = e.target.value;
                                return { ...prev, phones };
                              })
                            }
                            placeholder={
                              index === 0 ? "Main phone" : "Another phone"
                            }
                          />
                          {(profileDraft?.phones || []).length > 1 ? (
                            <button
                              type="button"
                              className="p-2 text-gray-400 hover:text-red-600"
                              aria-label="Remove phone"
                              onClick={() => {
                                profileDirty.current = true;
                                setProfileDraft((prev) => ({
                                  ...prev,
                                  phones: (prev.phones || []).filter(
                                    (_, i) => i !== index
                                  ),
                                }));
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : null}
                        </div>
                      ))}
                      <button
                        type="button"
                        className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
                        onClick={() => {
                          profileDirty.current = true;
                          setProfileDraft((prev) => ({
                            ...prev,
                            phones: [...(prev.phones || [""]), ""],
                          }));
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add phone number
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      value={profileDraft?.email || ""}
                      onChange={(e) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      placeholder="business@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      className="form-input"
                      value={profileDraft?.website || ""}
                      onChange={(e) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          website: e.target.value,
                        }))
                      }
                      placeholder="https://"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Address
                    </label>
                    <textarea
                      className="form-input"
                      rows={2}
                      value={profileDraft?.address || ""}
                      onChange={(e) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      placeholder="Street address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={profileDraft?.city || ""}
                      onChange={(e) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={profileDraft?.state || ""}
                      onChange={(e) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          state: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Business description
                    </label>
                    <textarea
                      className="form-input"
                      rows={4}
                      value={profileDraft?.description || ""}
                      onChange={(e) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      maxLength={1000}
                      placeholder="What your business does, what you sell, and who you serve"
                    />
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Currency & Tax Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Currency
                    </label>
                    <select
                      className="form-select"
                      value={settings.business?.currency || "NGN"}
                      onChange={(e) =>
                        handleBusinessSettingChange("currency", e.target.value)
                      }
                    >
                      <option value="NGN">Nigerian Naira (₦)</option>
                      <option value="USD">US Dollar ($)</option>
                      <option value="EUR">Euro (€)</option>
                      <option value="GBP">British Pound (£)</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-3 mt-6">
                    <input
                      type="checkbox"
                      id="taxEnabled"
                      className="form-checkbox"
                      checked={settings.business?.taxEnabled || false}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        updateBusinessMutation.mutate({
                          taxEnabled: enabled,
                          ...(enabled
                            ? {
                                taxName: settings.business?.taxName || "VAT",
                                taxRate:
                                  parseFloat(settings.business?.taxRate) || 7.5,
                              }
                            : {}),
                        });
                      }}
                    />
                    <label
                      htmlFor="taxEnabled"
                      className="text-sm font-medium text-gray-700"
                    >
                      Enable VAT
                    </label>
                  </div>
                </div>

                {settings.business?.taxEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tax name
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={settings.business?.taxName || "VAT"}
                        onChange={(e) =>
                          handleBusinessSettingChange("taxName", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Rate (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        className="form-input"
                        value={settings.business?.taxRate || 0}
                        onChange={(e) =>
                          handleBusinessSettingChange(
                            "taxRate",
                            parseFloat(e.target.value)
                          )
                        }
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Nigeria VAT is 7.5%
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        TIN
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={settings.business?.taxTin || ""}
                        placeholder="Business TIN"
                        onChange={(e) =>
                          handleBusinessSettingChange("taxTin", e.target.value)
                        }
                      />
                    </div>
                    <div className="md:col-span-2 rounded-lg bg-teal-50 p-4 text-sm text-teal-800">
                      Sales and paid orders collect <strong>output VAT</strong>.
                      Purchases claim <strong>input VAT</strong>. Payable is
                      output minus input. After you record a VAT payment, the
                      balance is <strong>net</strong>.
                      <Link to="/vat" className="ml-1 font-semibold underline">
                        Open VAT ledger
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Receipt Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="includeBusinessInfo"
                      className="form-checkbox"
                      checked={
                        settings.business?.receiptSettings
                          ?.includeBusinessInfo ?? true
                      }
                      onChange={(e) =>
                        handleBusinessSettingChange("settings", {
                          receiptSettings: {
                            ...settings.business?.receiptSettings,
                            includeBusinessInfo: e.target.checked,
                          },
                        })
                      }
                    />
                    <label
                      htmlFor="includeBusinessInfo"
                      className="text-sm font-medium text-gray-700"
                    >
                      Include business information on receipts
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="includeItemDetails"
                      className="form-checkbox"
                      checked={
                        settings.business?.receiptSettings
                          ?.includeItemDetails ?? true
                      }
                      onChange={(e) =>
                        handleBusinessSettingChange("settings", {
                          receiptSettings: {
                            ...settings.business?.receiptSettings,
                            includeItemDetails: e.target.checked,
                          },
                        })
                      }
                    />
                    <label
                      htmlFor="includeItemDetails"
                      className="text-sm font-medium text-gray-700"
                    >
                      Include detailed item breakdown
                    </label>
                  </div>

                  <div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="includeInvoice"
                        className="form-checkbox"
                        checked={
                          settings.business?.receiptSettings?.includeInvoice ??
                          true
                        }
                        onChange={(e) =>
                          handleBusinessSettingChange("settings", {
                            receiptSettings: {
                              ...settings.business?.receiptSettings,
                              includeInvoice: e.target.checked,
                            },
                          })
                        }
                      />
                      <label
                        htmlFor="includeInvoice"
                        className="text-sm font-medium text-gray-700"
                      >
                        Enable invoice on Sales
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 ml-7 mt-1">
                      When enabled, Sales can print invoices using the paper,
                      orientation, and color below.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="includeWaybill"
                        className="form-checkbox"
                        checked={
                          settings.business?.receiptSettings?.includeWaybill ??
                          true
                        }
                        onChange={(e) =>
                          handleBusinessSettingChange("settings", {
                            receiptSettings: {
                              ...settings.business?.receiptSettings,
                              includeWaybill: e.target.checked,
                            },
                          })
                        }
                      />
                      <label
                        htmlFor="includeWaybill"
                        className="text-sm font-medium text-gray-700"
                      >
                        Enable waybill on Sales
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 ml-7 mt-1">
                      When enabled, Sales can print a waybill in the same layout as the invoice, without prices.
                    </p>
                  </div>

                  {/* Invoice settings */}
                  {invoiceEnabled && (
                  <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Invoice
                    </h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Paper size
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {PAPER_FORMATS.map((option) => (
                          <button
                            key={`inv-${option.id}`}
                            type="button"
                            className={`btn ${
                              invoicePrint.paperFormat === option.id
                                ? "btn-primary"
                                : "btn-outline"
                            }`}
                            onClick={() =>
                              patchReceiptDoc("invoice", {
                                paperFormat: option.id,
                              })
                            }
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {invoicePrint.paperFormat !== "thermal" ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Orientation
                          </label>
                          <div className="grid grid-cols-2 gap-2 max-w-md">
                            {ORIENTATIONS.map((option) => (
                              <button
                                key={`inv-o-${option.id}`}
                                type="button"
                                className={`btn ${
                                  invoicePrint.orientation === option.id
                                    ? "btn-primary"
                                    : "btn-outline"
                                }`}
                                onClick={() =>
                                  patchReceiptDoc("invoice", {
                                    orientation: option.id,
                                  })
                                }
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Color
                          </label>
                          <div className="grid grid-cols-2 gap-2 max-w-md">
                            {COLOR_MODES.map((option) => (
                              <button
                                key={`inv-c-${option.id}`}
                                type="button"
                                className={`btn ${
                                  invoicePrint.colorMode === option.id
                                    ? "btn-primary"
                                    : "btn-outline"
                                }`}
                                onClick={() =>
                                  patchReceiptDoc("invoice", {
                                    colorMode: option.id,
                                  })
                                }
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Thermal invoice is always portrait and black &amp; white.
                      </p>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Footer Text
                      </label>
                      <textarea
                        className="form-input"
                        rows="3"
                        value={footerText}
                        onChange={(e) => setFooterDraft(e.target.value)}
                        onBlur={() => {
                          if (footerDraft === null || footerDraft === savedFooter) {
                            setFooterDraft(null);
                            return;
                          }
                          handleBusinessSettingChange("settings", {
                            receiptSettings: {
                              ...settings.business?.receiptSettings,
                              footerText: footerDraft,
                            },
                          });
                        }}
                        placeholder="Thank you for your business!"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Printed at the bottom of the invoice.
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Invoice preview — {formatPreviewLabel(invoicePrint)}
                      </p>
                      {invoicePreviewUrl ? (
                        <iframe
                          title="Invoice preview"
                          src={invoicePreviewUrl}
                          className="w-full h-[480px] rounded-lg bg-white border border-gray-200"
                        />
                      ) : (
                        <div className="h-[120px] flex items-center justify-center text-sm text-gray-500">
                          Loading invoice preview…
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn btn-outline mt-3"
                        onClick={async () => {
                          const { printSalesInvoice } = await import(
                            "../../utils/salesDocuments"
                          );
                          const business = {
                            ...(settings.business || {}),
                            receiptSettings: {
                              ...(settings.business?.receiptSettings || {}),
                              footerText,
                            },
                          };
                          printSalesInvoice({
                            business,
                            format: invoicePrint.paperFormat,
                            orientation: invoicePrint.orientation,
                            colorMode: invoicePrint.colorMode,
                            sale: sampleSaleForPreview(business),
                          });
                        }}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Print sample invoice
                      </button>
                    </div>
                  </div>
                  )}

                  {/* Waybill settings */}
                  {waybillEnabled && (
                    <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900">
                        Waybill
                      </h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Paper size
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {PAPER_FORMATS.map((option) => (
                            <button
                              key={`wb-${option.id}`}
                              type="button"
                              className={`btn ${
                                waybillPrint.paperFormat === option.id
                                  ? "btn-primary"
                                  : "btn-outline"
                              }`}
                              onClick={() =>
                                patchReceiptDoc("waybill", {
                                  paperFormat: option.id,
                                })
                              }
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {waybillPrint.paperFormat !== "thermal" ? (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Orientation
                            </label>
                            <div className="grid grid-cols-2 gap-2 max-w-md">
                              {ORIENTATIONS.map((option) => (
                                <button
                                  key={`wb-o-${option.id}`}
                                  type="button"
                                  className={`btn ${
                                    waybillPrint.orientation === option.id
                                      ? "btn-primary"
                                      : "btn-outline"
                                  }`}
                                  onClick={() =>
                                    patchReceiptDoc("waybill", {
                                      orientation: option.id,
                                    })
                                  }
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Color
                            </label>
                            <div className="grid grid-cols-2 gap-2 max-w-md">
                              {COLOR_MODES.map((option) => (
                                <button
                                  key={`wb-c-${option.id}`}
                                  type="button"
                                  className={`btn ${
                                    waybillPrint.colorMode === option.id
                                      ? "btn-primary"
                                      : "btn-outline"
                                  }`}
                                  onClick={() =>
                                    patchReceiptDoc("waybill", {
                                      colorMode: option.id,
                                    })
                                  }
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-gray-500">
                          Thermal waybill uses the same layout as the thermal invoice, without prices.
                        </p>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Footer Text
                        </label>
                        <textarea
                          className="form-input"
                          rows="3"
                          value={waybillFooterText}
                          onChange={(e) => setWaybillFooterDraft(e.target.value)}
                          onBlur={() => {
                            if (
                              waybillFooterDraft === null ||
                              waybillFooterDraft === savedWaybillFooter
                            ) {
                              setWaybillFooterDraft(null);
                              return;
                            }
                            handleBusinessSettingChange("settings", {
                              receiptSettings: {
                                ...settings.business?.receiptSettings,
                                waybillFooterText: waybillFooterDraft,
                              },
                            });
                          }}
                          placeholder="Thank you for your business!"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Printed at the bottom of the waybill.
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          {`Waybill preview — ${formatPreviewLabel(waybillPrint)}`}
                        </p>
                        {waybillPreviewUrl ? (
                          <iframe
                            title="Waybill preview"
                            src={waybillPreviewUrl}
                            className="w-full h-[480px] rounded-lg bg-white border border-gray-200"
                          />
                        ) : (
                          <div className="h-[120px] flex items-center justify-center text-sm text-gray-500">
                            Loading waybill preview…
                          </div>
                        )}
                        <button
                          type="button"
                          className="btn btn-outline mt-3"
                          onClick={async () => {
                            const { printSalesWaybill } = await import(
                              "../../utils/salesDocuments"
                            );
                            const business = {
                              ...(settings.business || {}),
                              receiptSettings: {
                                ...(settings.business?.receiptSettings || {}),
                                waybillFooterText,
                              },
                            };
                            printSalesWaybill({
                              business,
                              format: waybillPrint.paperFormat,
                              orientation: waybillPrint.orientation,
                              colorMode: waybillPrint.colorMode,
                              sale: sampleSaleForPreview(business),
                            });
                          }}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Print sample waybill
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Landmark className="w-5 h-5 text-teal-600" />
                      Bank Accounts
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Set up receiving accounts for bank payments. Assign a
                      default bank to each user under Preferences or Team.
                    </p>
                  </div>
                </div>

                {!canManageSettings && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-4">
                    Your account is <strong>{user?.role || "staff"}</strong>, so
                    you can view banks but not add or edit them. Ask the business
                    owner (or a manager) to set these up, or grant you{" "}
                    <strong>settings.manage</strong> in Team.
                  </div>
                )}

                {bankAccounts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 mb-4">
                    No bank accounts yet.
                    {canManageSettings
                      ? " Add one to use Bank at checkout."
                      : " An owner or manager needs to add one first."}
                  </div>
                ) : (
                  <ul className="space-y-2 mb-4">
                    {bankAccounts.map((bank) => (
                      <li
                        key={bank.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate">
                              {bank.bankName}
                            </p>
                            {bank.isDefault && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">
                                <Star className="w-3 h-3" />
                                Business default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {bank.accountName}
                          </p>
                          <p className="text-sm font-mono text-gray-500">
                            {bank.accountNumber}
                          </p>
                        </div>
                        {canManageSettings && (
                          <div className="flex items-center gap-2 shrink-0">
                            {!bank.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultBank(bank.id)}
                                className="text-xs font-medium text-teal-700 hover:text-teal-800 px-2 py-1 rounded-lg hover:bg-teal-50"
                              >
                                Make default
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBankId(bank.id);
                                setBankDraft({
                                  bankName: bank.bankName,
                                  accountName: bank.accountName,
                                  accountNumber: bank.accountNumber,
                                });
                              }}
                              className="text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1 rounded-lg hover:bg-gray-100"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBank(bank.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                              aria-label="Delete bank"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {canManageSettings && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                    <p className="text-sm font-medium text-gray-800">
                      {editingBankId ? "Edit bank account" : "Add bank account"}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        className="form-input"
                        placeholder="Bank name"
                        value={bankDraft.bankName}
                        onChange={(e) =>
                          setBankDraft({
                            ...bankDraft,
                            bankName: e.target.value,
                          })
                        }
                      />
                      <input
                        className="form-input"
                        placeholder="Account name"
                        value={bankDraft.accountName}
                        onChange={(e) =>
                          setBankDraft({
                            ...bankDraft,
                            accountName: e.target.value,
                          })
                        }
                      />
                      <input
                        className="form-input"
                        placeholder="Account number"
                        inputMode="numeric"
                        value={bankDraft.accountNumber}
                        onChange={(e) =>
                          setBankDraft({
                            ...bankDraft,
                            accountNumber: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveBank}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                      >
                        {editingBankId ? (
                          <Save className="w-4 h-4" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        {editingBankId ? "Update bank" : "Add bank"}
                      </button>
                      {editingBankId && (
                        <button
                          type="button"
                          onClick={resetBankForm}
                          className="rounded-xl px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Inventory Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Low Stock Threshold
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={settings.business?.lowStockThreshold || 10}
                      onChange={(e) =>
                        handleBusinessSettingChange("settings", {
                          lowStockThreshold: parseInt(e.target.value),
                        })
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Alert when products fall below this quantity
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Preferences */}
          {activeTab === "preferences" && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Display Preferences
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Theme
                    </label>
                    <div className="flex space-x-4">
                      <button
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
                          (settings.display?.theme || "light") === "light"
                            ? "border-primary-500 bg-primary-50 text-primary-700"
                            : "border-gray-300 bg-white text-gray-700"
                        }`}
                        onClick={() =>
                          handlePreferenceChange("display", "theme", "light")
                        }
                      >
                        <Sun className="w-4 h-4" />
                        <span>Light</span>
                      </button>
                      <button
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
                          settings.display?.theme === "dark"
                            ? "border-primary-500 bg-primary-50 text-primary-700"
                            : "border-gray-300 bg-white text-gray-700"
                        }`}
                        onClick={() =>
                          handlePreferenceChange("display", "theme", "dark")
                        }
                      >
                        <Moon className="w-4 h-4" />
                        <span>Dark</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date Format
                    </label>
                    <select
                      className="form-select"
                      value={settings.display?.dateFormat || "DD/MM/YYYY"}
                      onChange={(e) =>
                        handlePreferenceChange(
                          "display",
                          "dateFormat",
                          e.target.value
                        )
                      }
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Sales Preferences
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Default Payment Method
                    </label>
                    <select
                      className="form-select max-w-xs"
                      value={settings.pos?.defaultPaymentMethod || "cash"}
                      onChange={(e) =>
                        handlePreferenceChange(
                          "pos",
                          "defaultPaymentMethod",
                          e.target.value
                        )
                      }
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Bank</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Used when you open checkout on Sales. Applies only to your account.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Default Bank Account
                    </label>
                    <select
                      className="form-select max-w-md"
                      disabled={bankAccounts.length === 0}
                      value={settings.pos?.defaultBankAccountId || ""}
                      onChange={(e) =>
                        handlePreferenceChange(
                          "pos",
                          "defaultBankAccountId",
                          e.target.value || null
                        )
                      }
                    >
                      <option value="">
                        {bankAccounts.length === 0
                          ? "Add a bank in Business settings first"
                          : "Use business default"}
                      </option>
                      {bankAccounts.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {bank.bankName} · {bank.accountNumber}
                          {bank.isDefault ? " (business default)" : ""}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Pre-selected when your payment method is Bank.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Security Preferences
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Session Timeout (hours)
                    </label>
                    <select
                      className="form-select max-w-xs"
                      value={settings.security?.sessionTimeout || 24}
                      onChange={(e) =>
                        handlePreferenceChange(
                          "security",
                          "sessionTimeout",
                          parseInt(e.target.value)
                        )
                      }
                    >
                      <option value={1}>1 hour</option>
                      <option value={4}>4 hours</option>
                      <option value={8}>8 hours</option>
                      <option value={24}>24 hours</option>
                      <option value={168}>1 week</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Notification Preferences
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Low Stock Alerts
                    </p>
                    <p className="text-sm text-gray-500">
                      Get notified when products are running low
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={settings.notifications?.lowStockAlerts ?? true}
                    onChange={(e) =>
                      handlePreferenceChange(
                        "notifications",
                        "lowStockAlerts",
                        e.target.checked
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Overdue Payments
                    </p>
                    <p className="text-sm text-gray-500">
                      Alerts for overdue supplier payments
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={settings.notifications?.overduePayments ?? true}
                    onChange={(e) =>
                      handlePreferenceChange(
                        "notifications",
                        "overduePayments",
                        e.target.checked
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Daily Reports
                    </p>
                    <p className="text-sm text-gray-500">
                      Receive daily business summary reports
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={settings.notifications?.dailyReports ?? false}
                    onChange={(e) =>
                      handlePreferenceChange(
                        "notifications",
                        "dailyReports",
                        e.target.checked
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Push Notifications
                    </p>
                    <p className="text-sm text-gray-500">
                      Browser push notifications for alerts
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={settings.notifications?.pushNotifications ?? true}
                    onChange={(e) =>
                      handlePreferenceChange(
                        "notifications",
                        "pushNotifications",
                        e.target.checked
                      )
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Data & Export */}
          {activeTab === "data" && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Export Data
                </h3>
                <p className="text-gray-600 mb-6">
                  Export your business data in CSV format for analysis or backup
                  purposes.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {exportOptions.map((option) => (
                    <div
                      key={option.key}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">
                          {option.name}
                        </h4>
                        <button
                          onClick={() => exportData(option.key)}
                          className="btn btn-sm btn-outline"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </button>
                      </div>
                      <p className="text-sm text-gray-500">
                        {option.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Backup & Restore
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-blue-900">
                        Create Full Backup
                      </h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Download a complete backup of all your business data
                      </p>
                    </div>
                    <button onClick={createBackup} className="btn btn-primary">
                      <Archive className="w-4 h-4 mr-2" />
                      Create Backup
                    </button>
                  </div>
                </div>
              </div>

              <div className="card p-6 border-red-200">
                <h3 className="text-lg font-semibold text-red-600 mb-4">
                  Danger Zone
                </h3>
                <div className="space-y-4">
                  {!showResetConfirm ? (
                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-red-900">
                          Reset All Data
                        </h4>
                        <p className="text-sm text-red-700 mt-1">
                          Permanently delete all business data. This action
                          cannot be undone.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowResetConfirm(true)}
                        className="btn btn-danger"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset Data
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center mb-4">
                        <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
                        <h4 className="font-bold text-red-900">
                          Confirm Data Reset
                        </h4>
                      </div>
                      <p className="text-red-700 mb-4">
                        This will permanently delete ALL your business data
                        including products, sales, purchases, customers, and
                        suppliers. This action cannot be undone.
                      </p>
                      <p className="text-red-700 mb-4">
                        Type <strong>"DELETE ALL DATA"</strong> to confirm:
                      </p>
                      <input
                        type="text"
                        className="form-input mb-4"
                        value={resetConfirmText}
                        onChange={(e) => setResetConfirmText(e.target.value)}
                        placeholder="DELETE ALL DATA"
                      />
                      <div className="flex space-x-3">
                        <button
                          onClick={resetBusinessData}
                          disabled={resetConfirmText !== "DELETE ALL DATA"}
                          className="btn btn-danger"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Confirm Reset
                        </button>
                        <button
                          onClick={() => {
                            setShowResetConfirm(false);
                            setResetConfirmText("");
                          }}
                          className="btn btn-outline"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* System Information */}
          {activeTab === "system" && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  System Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">
                      Application
                    </h4>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">Version</dt>
                        <dd className="text-sm font-medium">
                          {systemInfo.version}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">Environment</dt>
                        <dd className="text-sm font-medium capitalize">
                          {systemInfo.environment}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">
                      Business Data
                    </h4>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">Products</dt>
                        <dd className="text-sm font-medium">
                          {systemInfo.business?.totalProducts || 0}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">Customers</dt>
                        <dd className="text-sm font-medium">
                          {systemInfo.business?.totalCustomers || 0}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">Sales</dt>
                        <dd className="text-sm font-medium">
                          {systemInfo.business?.totalSales || 0}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>

              {systemInfo.business?.createdAt && (
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Business Information
                  </h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Business Name</dt>
                      <dd className="text-sm font-medium">
                        {systemInfo.business.name}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Created</dt>
                      <dd className="text-sm font-medium">
                        {new Date(
                          systemInfo.business.createdAt
                        ).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
