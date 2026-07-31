export const generateEventId = () => {
  return 'evt_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
};

export const getCookie = (name: string) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return match[2];
  return null;
};

export const trackEvent = async (eventName: string, eventData: any = {}) => {
  const eventId = generateEventId();

  // 1. Client-Side Tracking (Meta Pixel)
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, eventData, { eventID: eventId });
  }

  // 2. Server-Side Tracking (CAPI)
  try {
    const fbp = getCookie('_fbp');
    const fbc = getCookie('_fbc');
    
    // We only call our own API route from the client
    fetch('/api/capi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventName,
        eventData,
        eventId,
        eventSourceUrl: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
        fbp,
        fbc,
      }),
      // Use keepalive so the request still goes through if the user navigates away
      keepalive: true,
    }).catch(console.error);
  } catch (error) {
    console.error('Failed to trigger CAPI event:', error);
  }
};
