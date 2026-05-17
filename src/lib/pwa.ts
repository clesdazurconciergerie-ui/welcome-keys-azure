// PWA / push helpers for the prestataire portal.
// Service worker registration is guarded against Lovable preview iframes
// to avoid cache pollution during development.

export const isInIframe = (() => {
  try {
    return typeof window !== "undefined" && window.self !== window.top;
  } catch {
    return true;
  }
})();

export const isPreviewHost =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com") ||
    window.location.hostname.includes("lovable.app"));

export const canUseServiceWorker =
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  !isInIframe &&
  !isPreviewHost;

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!canUseServiceWorker) {
    // Clean up any leftover SWs in preview/iframe contexts
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      } catch {
        /* noop */
      }
    }
    return null;
  }
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (e) {
    console.warn("[pwa] SW registration failed", e);
    return null;
  }
}

export async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!canUseServiceWorker) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export function getNotificationPermission(): PushPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as PushPermission;
}

export async function requestNotificationPermission(): Promise<PushPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  const result = await Notification.requestPermission();
  return result as PushPermission;
}

export async function showLocalNotification(
  title: string,
  options: NotificationOptions & { url?: string } = {}
) {
  if (getNotificationPermission() !== "granted") return;
  const { url, ...rest } = options;
  const reg = await getRegistration();
  const payload: NotificationOptions = {
    icon: "/brand/logo-wlekom-icon.png",
    badge: "/brand/logo-wlekom-icon.png",
    ...rest,
    data: { url: url || "/prestataire/missions", ...(rest.data || {}) },
  };
  if (reg) {
    await reg.showNotification(title, payload);
  } else if ("Notification" in window) {
    new Notification(title, payload);
  }
}
