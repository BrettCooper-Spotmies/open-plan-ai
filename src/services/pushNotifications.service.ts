import { apiClient } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import { config } from '@/config';
import { logger } from '@/services/monitoring/logger';

// ─── Support detection ─────────────────────────────────────────────────────────

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getPermissionState(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

// ─── Service worker registration ───────────────────────────────────────────────

let registrationPromise: Promise<ServiceWorkerRegistration> | null = null;

function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker.register('/sw.js');
  }
  return registrationPromise;
}

// ─── VAPID key conversion ───────────────────────────────────────────────────────
// PushManager.subscribe() needs applicationServerKey as a Uint8Array, not the
// base64url string the backend/env hand us.

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * Whether this browser currently holds a live PushManager subscription.
 * Distinct from the backend's `pushEnabled` preference: the preference can
 * say "on" while the underlying subscription is actually dead (e.g. the push
 * service rejected it and the backend cleaned it up server-side) — this is
 * the only way to know the two have drifted apart.
 */
export async function hasLiveSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = await registration?.pushManager.getSubscription();
    return Boolean(subscription);
  } catch {
    return false;
  }
}

// ─── Subscribe / unsubscribe ───────────────────────────────────────────────────

/**
 * Requests notification permission (must be called from a user gesture —
 * e.g. a settings toggle click, never on page load) and, if granted,
 * subscribes to push and registers the subscription with the backend.
 * Returns false without throwing if unsupported, denied, or misconfigured.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (!config.push.vapidPublicKey) {
    logger.error('VITE_VAPID_PUBLIC_KEY is not set — cannot subscribe to push');
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  try {
    const registration = await registerServiceWorker();
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.push.vapidPublicKey),
      });
    }

    const json = subscription.toJSON();
    await apiClient.post(ENDPOINTS.PUSH.SUBSCRIBE, {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    });

    return true;
  } catch (error) {
    logger.error('Failed to subscribe to push notifications:', error);
    return false;
  }
}

/**
 * Unsubscribes the current browser from push and removes the subscription
 * from the backend. Safe to call even if never subscribed.
 */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await apiClient.delete(ENDPOINTS.PUSH.UNSUBSCRIBE, { data: { endpoint } });
  } catch (error) {
    logger.error('Failed to unsubscribe from push notifications:', error);
  }
}
