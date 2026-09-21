import React, { useState, useEffect } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { syncManager } from "../../utils/offline";

const OfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState({
    isOnline: true,
    pendingSync: 0,
    syncInProgress: false,
    lastSync: null,
  });
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Update online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineBanner(false);
      toast.success("Connection restored", {
        icon: "🟢",
        duration: 3000,
      });

      // Trigger sync when back online
      setTimeout(async () => {
        await updateSyncStatus();
        if (syncStatus.pendingSync > 0) {
          await handleSync();
        }
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineBanner(true);
      toast.error("Connection lost - working offline", {
        icon: "🔴",
        duration: 5000,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial status check
    updateSyncStatus();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Update sync status periodically
  useEffect(() => {
    const interval = setInterval(updateSyncStatus, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const updateSyncStatus = async () => {
    try {
      const status = await syncManager.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error("Failed to get sync status:", error);
    }
  };

  const handleSync = async () => {
    if (!isOnline) {
      toast.error("Cannot sync while offline");
      return;
    }

    setSyncing(true);
    try {
      await syncManager.forceSync();
      await updateSyncStatus();
      toast.success("Sync completed successfully");
    } catch (error) {
      toast.error("Sync failed: " + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = (timestamp) => {
    if (!timestamp) return "Never";

    const date = new Date(parseInt(timestamp));
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString();
  };

  // Don't render anything if online and no pending syncs
  if (isOnline && syncStatus.pendingSync === 0 && !showOfflineBanner) {
    return null;
  }

  return (
    <>
      {/* Offline Banner */}
      {showOfflineBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-2">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-2">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-medium">
                You're offline - changes will sync when connected
              </span>
            </div>
            <button
              onClick={() => setShowOfflineBanner(false)}
              className="p-1 hover:bg-red-700 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sync Status Indicator */}
      {(syncStatus.pendingSync > 0 || syncStatus.syncInProgress) && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {syncStatus.syncInProgress || syncing ? (
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                ) : syncStatus.pendingSync > 0 ? (
                  <Clock className="w-4 h-4 text-yellow-600" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {syncStatus.syncInProgress || syncing
                    ? "Syncing..."
                    : syncStatus.pendingSync > 0
                    ? "Pending Sync"
                    : "All Synced"}
                </span>
              </div>

              {/* Connection Status */}
              <div className="flex items-center space-x-1">
                {isOnline ? (
                  <Wifi className="w-3 h-3 text-green-600" />
                ) : (
                  <WifiOff className="w-3 h-3 text-red-600" />
                )}
              </div>
            </div>

            {/* Sync Details */}
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              {syncStatus.pendingSync > 0 && (
                <div className="flex items-center justify-between">
                  <span>Pending items:</span>
                  <span className="font-medium">{syncStatus.pendingSync}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span>Last sync:</span>
                <span className="font-medium">
                  {formatLastSync(syncStatus.lastSync)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Status:</span>
                <span
                  className={`font-medium ${
                    isOnline ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>
            </div>

            {/* Sync Button */}
            {isOnline && syncStatus.pendingSync > 0 && !syncStatus.syncInProgress && !syncing && (
              <button
                onClick={handleSync}
                className="w-full mt-3 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                <Zap className="w-3 h-3" />
                <span>Sync Now</span>
              </button>
            )}

            {/* Offline Message */}
            {!isOnline && syncStatus.pendingSync > 0 && (
              <div className="mt-3 flex items-start space-x-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium">Changes saved locally</p>
                  <p>Will sync automatically when connection is restored</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default OfflineStatus;

