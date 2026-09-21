// Service Worker for Inventria Mobile
const CACHE_NAME = 'inventria-v1';
const API_CACHE_NAME = 'inventria-api-v1';

// Assets to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  // Add other static assets
];

// API endpoints that can be cached
const CACHEABLE_API_PATTERNS = [
  /^\/api\/products/,
  /^\/api\/customers/,
  /^\/api\/suppliers/,
  /^\/api\/dashboard\/stats/,
  /^\/api\/reports/,
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Claim all clients
        return self.clients.claim();
      })
  );
});

// Fetch handler with caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request));
    return;
  }
});

// Handle API requests with network-first strategy for critical data
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isGET = request.method === 'GET';
  const isCacheable = CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname));

  // For GET requests to cacheable endpoints
  if (isGET && isCacheable) {
    return networkFirstWithCache(request);
  }

  // For POST/PUT/DELETE requests (mutations)
  if (!isGET) {
    return handleMutationRequest(request);
  }

  // For non-cacheable GET requests
  return fetch(request).catch(() => {
    return new Response(
      JSON.stringify({
        error: 'Network unavailable',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  });
}

// Network-first strategy with cache fallback
async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE_NAME);

      // Create a clean cache key (remove query params for list endpoints to avoid duplicates)
      const url = new URL(request.url);
      let cacheKey = request;

      // For list/search endpoints, use base URL without query params to avoid cache bloat
      if (url.pathname.includes('/list') || url.searchParams.has('search')) {
        const baseUrl = new URL(url.pathname, url.origin);
        cacheKey = new Request(baseUrl.toString(), request);
      }

      await cache.put(cacheKey, response.clone());

      // Clean up old cache entries periodically (keep only last 50)
      await cleanupOldCacheEntries(cache, 50);
    }

    return response;
  } catch (error) {
    console.log('Network failed, trying cache...', request.url);

    // Try exact match first
    let cachedResponse = await caches.match(request);

    // If no exact match, try base URL (for list endpoints)
    if (!cachedResponse) {
      const url = new URL(request.url);
      const baseUrl = new URL(url.pathname, url.origin);
      cachedResponse = await caches.match(baseUrl.toString());
    }

    if (cachedResponse) {
      // Add offline indicator to cached response
      const data = await cachedResponse.json();
      return new Response(
        JSON.stringify({ ...data, _offline: true }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    throw error;
  }
}

// Clean up old cache entries (keep most recent N entries)
async function cleanupOldCacheEntries(cache, maxEntries = 50) {
  try {
    const keys = await cache.keys();

    if (keys.length > maxEntries) {
      // Delete oldest entries (first ones in the array)
      const toDelete = keys.slice(0, keys.length - maxEntries);
      await Promise.all(toDelete.map(key => cache.delete(key)));

      console.log(`Cleaned up ${toDelete.length} old cache entries`);
    }
  } catch (error) {
    console.error('Failed to cleanup cache:', error);
  }
}

// Handle mutation requests (POST/PUT/DELETE) with background sync
async function handleMutationRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.log('Mutation failed, queuing for sync...', request.url);

    // Store failed request for background sync
    await queueRequestForSync(request);

    return new Response(
      JSON.stringify({
        success: true,
        queued: true,
        message: 'Request queued for sync when online'
      }),
      {
        status: 202, // Accepted
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/index.html');
      return offlineResponse || new Response('Offline');
    }
    throw error;
  }
}

// Queue failed requests for background sync
async function queueRequestForSync(request) {
  try {
    const body = await request.text();
    const queueItem = {
      id: Date.now() + Math.random(),
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: body,
      timestamp: Date.now(),
    };

    // Store in IndexedDB
    const db = await openSyncDatabase();
    const transaction = db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    await store.add(queueItem);

    console.log('Queued request for sync:', queueItem);
  } catch (error) {
    console.error('Failed to queue request:', error);
  }
}

// Open IndexedDB for sync queue
function openSyncDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('InventriaSyncDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Create offline data store
      if (!db.objectStoreNames.contains('offlineData')) {
        const store = db.createObjectStore('offlineData', { keyPath: 'key' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'inventria-sync') {
    event.waitUntil(syncQueuedRequests());
  }
});

// Process queued requests when back online
async function syncQueuedRequests() {
  try {
    const db = await openSyncDatabase();
    const transaction = db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    const requests = await store.getAll();

    console.log(`Processing ${requests.length} queued requests`);

    for (const queueItem of requests) {
      try {
        const response = await fetch(queueItem.url, {
          method: queueItem.method,
          headers: queueItem.headers,
          body: queueItem.body,
        });

        if (response.ok) {
          // Remove from queue on success
          const deleteTransaction = db.transaction(['syncQueue'], 'readwrite');
          const deleteStore = deleteTransaction.objectStore('syncQueue');
          await deleteStore.delete(queueItem.id);

          console.log('Synced request:', queueItem.url);

          // Notify all clients about successful sync
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'SYNC_SUCCESS',
                request: queueItem
              });
            });
          });
        }
      } catch (error) {
        console.error('Failed to sync request:', queueItem.url, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push received:', event);

  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
    },
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/icons/open.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Inventria', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_API_DATA') {
    cacheApiData(event.data.key, event.data.data);
  }

  if (event.data.type === 'CLEAR_CACHE') {
    clearAllCaches().then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// Clear all caches
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('All caches cleared');
    return true;
  } catch (error) {
    console.error('Failed to clear caches:', error);
    return false;
  }
}

// Cache API data for offline use
async function cacheApiData(key, data) {
  try {
    const db = await openSyncDatabase();
    const transaction = db.transaction(['offlineData'], 'readwrite');
    const store = transaction.objectStore('offlineData');

    await store.put({
      key,
      data,
      timestamp: Date.now(),
      type: 'api'
    });

    console.log('Cached API data:', key);
  } catch (error) {
    console.error('Failed to cache API data:', error);
  }
}
