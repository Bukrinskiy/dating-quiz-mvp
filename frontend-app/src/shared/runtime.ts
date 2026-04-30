const readConfig = (key: keyof WindowAppConfig, fallback: string): string => {
  const runtimeValue = typeof window !== "undefined" ? window.__APP_CONFIG__?.[key] : undefined;
  return runtimeValue?.trim() || fallback;
};

export const runtimeConfig = {
  appSurface: readConfig("APP_SURFACE", "app"),
  apiBaseUrl: readConfig("API_BASE_URL", "http://localhost:8000"),
  payPublicBaseUrl: readConfig("PAY_PUBLIC_BASE_URL", "http://localhost:5176"),
  appPublicBaseUrl: readConfig("APP_PUBLIC_BASE_URL", "http://localhost:5177"),
  vapidPublicKey: readConfig("VAPID_PUBLIC_KEY", ""),
};

export const buildApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, runtimeConfig.apiBaseUrl).toString();
};

export const buildPayUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, runtimeConfig.payPublicBaseUrl).toString();
};
