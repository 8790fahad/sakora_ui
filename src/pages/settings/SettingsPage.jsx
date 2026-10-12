import React, { useState } from "react";
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
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import api from "../../services/api";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("business");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

  const queryClient = useQueryClient();

  // Fetch settings
  const {
    data: settingsData,
    isLoading: settingsLoading,
    refetch: refetchSettings,
  } = useQuery("settings", api.settings.get, {
    refetchOnWindowFocus: false,
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
  const systemInfo = systemData?.data || {};

  // Update business settings
  const updateBusinessMutation = useMutation(api.settings.updateBusiness, {
    onSuccess: () => {
      toast.success("Business settings updated successfully");
      refetchSettings();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update settings");
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
    const updatedSettings = {
      [field]: value,
    };

    if (field === "settings") {
      updatedSettings.settings = {
        ...settings.business,
        ...value,
      };
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
                      Include a waybill with the sales invoice PDF
                    </label>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={async () => {
                      const { downloadSalesInvoicePdf } = await import(
                        "../../utils/salesInvoicePdf"
                      );
                      const business = settings.business || {};
                      downloadSalesInvoicePdf({
                        business,
                        includeWaybill:
                          business.receiptSettings?.includeWaybill !== false,
                        sale: {
                          saleNumber: "SAMPLE",
                          date: new Date().toISOString(),
                          customer: {
                            name: "Sample customer",
                            phone: "08000000000",
                          },
                          paymentMethod: "cash",
                          paymentStatus: "paid",
                          subtotal: 3000,
                          taxAmount: business.taxEnabled
                            ? 3000 * (Number(business.taxRate || 0) / 100)
                            : 0,
                          total: business.taxEnabled
                            ? 3000 * (1 + Number(business.taxRate || 0) / 100)
                            : 3000,
                          items: [
                            {
                              quantity: 1,
                              unitPrice: 3000,
                              totalPrice: 3000,
                              product: { name: "Sample product", unit: "piece" },
                            },
                          ],
                        },
                      });
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Download sales invoice PDF
                  </button>
                  <p className="text-xs text-gray-500">
                    Sample invoice and waybill using your business details. Sales history downloads the same PDF for a real sale.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Footer Text
                    </label>
                    <textarea
                      className="form-input"
                      rows="3"
                      value={
                        settings.business?.receiptSettings?.footerText || ""
                      }
                      onChange={(e) =>
                        handleBusinessSettingChange("settings", {
                          receiptSettings: {
                            ...settings.business?.receiptSettings,
                            footerText: e.target.value,
                          },
                        })
                      }
                      placeholder="Thank you for your business!"
                    />
                  </div>
                </div>
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
