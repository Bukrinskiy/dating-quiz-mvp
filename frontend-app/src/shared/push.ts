import { apiFetch } from "../app/api";
import { runtimeConfig } from "./runtime";

const decodeBase64Url = (input: string): Uint8Array => {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

export const canUsePush = (): boolean =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window &&
  Boolean(runtimeConfig.vapidPublicKey);

export const subscribeToPush = async (accessToken: string | null) => {
  if (!canUsePush()) {
    throw new Error("push_unavailable");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("push_denied");
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    applicationServerKey: decodeBase64Url(runtimeConfig.vapidPublicKey),
    userVisibleOnly: true,
  });

  const response = await apiFetch(
    "/api/app/push/subscribe",
    {
      body: JSON.stringify(subscription),
      method: "POST",
    },
    accessToken,
  );

  if (!response.ok) {
    throw new Error("push_subscribe_failed");
  }

  return subscription;
};
