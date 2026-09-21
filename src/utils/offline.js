// Offline storage and sync utilities for Inventria Mobile

class OfflineStorage {
  constructor() {
    this.dbName = 'InventriaOfflineDB';
    this.dbVersion = 1;
    this.db = null;
  }

  // Initialize IndexedDB
  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Products store
        if (!db.objectStoreNames.contains('products')) {
          const store = db.createObjectStore('products', { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('sku', 'sku', { unique: true });
          store.createIndex('category', 'categoryId', { unique: false });
        }

        // Sales store
        if (!db.objectStoreNames.contains('sales')) {
          const store = db.createObjectStore('sales', { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
        }

        // Customers store
        if (!db.objectStoreNames.contains('customers')) {
          const store = db.createObjectStore('customers', { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
        }

        // Suppliers store
        if (!db.objectStoreNames.contains('suppliers')) {
          const store = db.createObjectStore('suppliers', { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
        }

        // Categories store
        if (!db.objectStoreNames.contains('categories')) {
          const store = db.createObjectStore('categories', { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
        }

        // Offline queue store
        if (!db.objectStoreNames.contains('offlineQueue')) {
          const store = db.createObjectStore('offlineQueue', { keyPath: 'id', autoIncrement: true });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          const store = db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  // Store data in IndexedDB
  async store(storeName, data) {
    await this.init();
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    if (Array.isArray(data)) {
      await Promise.all(data.map(item => store.put(item)));
    } else {
      await store.put(data);
    }
  }

  // Get data from IndexedDB
  async get(storeName, key = null) {
    await this.init();
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    if (key) {
      return store.get(key);
    } else {
      return store.getAll();
    }
  }

  // Get data by index
  async getByIndex(storeName, indexName, value) {
    await this.init();
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    return index.getAll(value);
  }

  // Delete data from IndexedDB
  async delete(storeName, key) {
    await this.init();
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    return store.delete(key);
  }

  // Clear all data from a store
  async clear(storeName) {
    await this.init();
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    return store.clear();
  }

  // Add item to offline queue
  async addToQueue(type, action, data) {
    const queueItem = {
      type,
      action,
      data,
      timestamp: Date.now(),
      retries: 0,
      synced: false,
    };

    await this.store('offlineQueue', queueItem);
    return queueItem;
  }

  // Get unsynced items from queue
  async getUnsyncedItems() {
    await this.init();
    return this.getByIndex('offlineQueue', 'synced', false);
  }

  // Mark queue item as synced
  async markSynced(id) {
    await this.init();
    const transaction = this.db.transaction(['offlineQueue'], 'readwrite');
    const store = transaction.objectStore(offlineQueue);
    const item = await store.get(id);

    if (item) {
      item.synced = true;
      item.syncedAt = Date.now();
      await store.put(item);
    }
  }
}

class SyncManager {
  constructor() {
    this.storage = new OfflineStorage();
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.syncCallbacks = [];

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_SUCCESS') {
          this.notifySyncSuccess(event.data.request);
        }
      });
    }
  }

  // Add sync callback
  onSync(callback) {
    this.syncCallbacks.push(callback);
  }

  // Notify sync success
  notifySyncSuccess(request) {
    this.syncCallbacks.forEach(callback => {
      try {
        callback({ type: 'success', request });
      } catch (error) {
        console.error('Sync callback error:', error);
      }
    });
  }

  // Cache essential data for offline use
  async cacheEssentialData(data) {
    try {
      if (data.products) {
        await this.storage.store('products', data.products);
      }

      if (data.customers) {
        await this.storage.store('customers', data.customers);
      }

      if (data.suppliers) {
        await this.storage.store('suppliers', data.suppliers);
      }

      if (data.categories) {
        await this.storage.store('categories', data.categories);
      }

      console.log('Essential data cached for offline use');
    } catch (error) {
      console.error('Failed to cache essential data:', error);
    }
  }

  // Create offline sale
  async createOfflineSale(saleData) {
    try {
      // Generate temporary ID
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const offlineSale = {
        ...saleData,
        id: tempId,
        offline: true,
        synced: false,
        createdOffline: true,
        timestamp: Date.now(),
      };

      // Store in offline sales
      await this.storage.store('sales', offlineSale);

      // Add to sync queue
      await this.storage.addToQueue('sale', 'create', offlineSale);

      console.log('Sale created offline:', tempId);

      // Trigger sync if online
      if (this.isOnline) {
        this.triggerSync();
      }

      return offlineSale;
    } catch (error) {
      console.error('Failed to create offline sale:', error);
      throw error;
    }
  }

  // Get offline sales
  async getOfflineSales() {
    try {
      const sales = await this.storage.get('sales');
      return sales.filter(sale => sale.offline && !sale.synced);
    } catch (error) {
      console.error('Failed to get offline sales:', error);
      return [];
    }
  }

  // Trigger sync process
  async triggerSync() {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      const unsyncedItems = await this.storage.getUnsyncedItems();
      console.log(`Starting sync for ${unsyncedItems.length} items`);

      for (const item of unsyncedItems) {
        await this.syncItem(item);
      }

      console.log('Sync completed successfully');

      // Trigger background sync via service worker
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('inventria-sync');
      }

    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync individual item
  async syncItem(item) {
    try {
      let response;

      switch (item.type) {
        case 'sale':
          response = await this.syncSale(item);
          break;
        case 'expense':
          response = await this.syncExpense(item);
          break;
        case 'purchase':
          response = await this.syncPurchase(item);
          break;
        default:
          console.warn('Unknown sync item type:', item.type);
          return;
      }

      if (response && response.ok) {
        await this.storage.markSynced(item.id);
        console.log(`Synced ${item.type}:`, item.id);
      }

    } catch (error) {
      console.error(`Failed to sync ${item.type}:`, item.id, error);

      // Increment retry count
      item.retries = (item.retries || 0) + 1;
      item.lastRetry = Date.now();

      // Store updated item (with retry count)
      await this.storage.store('offlineQueue', item);
    }
  }

  // Sync sale to server
  async syncSale(item) {
    const saleData = { ...item.data };

    // Remove offline-specific fields
    delete saleData.offline;
    delete saleData.synced;
    delete saleData.createdOffline;
    delete saleData.timestamp;

    return fetch('/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(saleData),
    });
  }

  // Sync expense to server
  async syncExpense(item) {
    const expenseData = { ...item.data };

    delete expenseData.offline;
    delete expenseData.synced;
    delete expenseData.createdOffline;
    delete expenseData.timestamp;

    return fetch('/api/expenses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(expenseData),
    });
  }

  // Sync purchase to server
  async syncPurchase(item) {
    const purchaseData = { ...item.data };

    delete purchaseData.offline;
    delete purchaseData.synced;
    delete purchaseData.createdOffline;
    delete purchaseData.timestamp;

    return fetch('/api/purchases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(purchaseData),
    });
  }

  // Get sync status
  async getSyncStatus() {
    const unsyncedItems = await this.storage.getUnsyncedItems();
    return {
      isOnline: this.isOnline,
      pendingSync: unsyncedItems.length,
      syncInProgress: this.syncInProgress,
      lastSync: localStorage.getItem('lastSyncTime'),
    };
  }

  // Force sync
  async forceSync() {
    if (this.isOnline) {
      await this.triggerSync();
      localStorage.setItem('lastSyncTime', Date.now().toString());
    } else {
      throw new Error('Cannot sync while offline');
    }
  }
}

// Create singleton instances
export const offlineStorage = new OfflineStorage();
export const syncManager = new SyncManager();

// Utility functions
export const isOnline = () => navigator.onLine;

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New version available
              console.log('New version available');
              // Notify user about update
            } else {
              // App is now offline-ready
              console.log('App is now offline-ready');
            }
          }
        });
      });

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  } else {
    throw new Error('Service Worker not supported');
  }
};

export const requestPersistentStorage = async () => {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    const persistent = await navigator.storage.persist();
    console.log(`Persistent storage ${persistent ? 'granted' : 'denied'}`);
    return persistent;
  }
  return false;
};

export const getStorageEstimate = async () => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    return await navigator.storage.estimate();
  }
  return null;
};

// Clear all service worker caches
export const clearServiceWorkerCache = async () => {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('Service worker caches cleared');

      // Also clear IndexedDB sync queue
      if ('indexedDB' in window) {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open('InventriaSyncDB', 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        const transaction = db.transaction(['syncQueue'], 'readwrite');
        const store = transaction.objectStore('syncQueue');
        await store.clear();
        console.log('Sync queue cleared');
      }

      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to clear service worker cache:', error);
    return false;
  }
};

// Initialize offline capabilities
export const initializeOffline = async () => {
  try {
    // Register service worker
    await registerServiceWorker();

    // Request persistent storage
    await requestPersistentStorage();

    // Initialize offline storage
    await offlineStorage.init();

    console.log('Offline capabilities initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize offline capabilities:', error);
    return false;
  }
};
