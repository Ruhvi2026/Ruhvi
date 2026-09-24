// Scripts for firebase and firebase messaging
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data || {};
  let targetUrl = '/account/notifications';
  
  if (data.url) {
    targetUrl = data.url;
  } else if (data.category) {
    switch(data.category) {
      case 'ORDERS':
        targetUrl = data.reference_id ? `/account/orders/${data.reference_id}` : '/account/orders';
        break;
      case 'WALLET':
        targetUrl = '/account/wallet';
        break;
      case 'REWARDS':
        targetUrl = '/account/coins';
        break;
      case 'OFFERS':
      case 'UPDATES':
      case 'PERSONAL':
      default:
        targetUrl = '/account/notifications';
        break;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && 'focus' in client) {
          client.focus();
          return client.navigate(targetUrl);
        }
      }
      // If no window/tab is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Initialize Firebase app asynchronously
async function initFirebase() {
  try {
    const response = await fetch('/api/firebase-config');
    const config = await response.json();
    firebase.initializeApp(config);
    const messaging = firebase.messaging();
    
    // Background message handler
    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background message ', payload);
      const notificationTitle = payload.notification?.title || 'New Notification';
      const notificationOptions = {
        body: payload.notification?.body,
        icon: '/logo.png',
        image: payload.notification?.image || payload.data?.imageUrl,
        data: payload.data || {},
      };
      
      return self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Messaging SW', error);
  }
}

// Call initialization
initFirebase();
