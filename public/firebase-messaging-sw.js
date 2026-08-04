// Scripts for firebase and firebase messaging
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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
      };
      
      return self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Messaging SW', error);
  }
}

// Call initialization
initFirebase();
