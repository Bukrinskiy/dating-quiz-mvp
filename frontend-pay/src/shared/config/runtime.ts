const getBrowserWindow = (): Window | undefined => (typeof window !== "undefined" ? window : undefined);

const getRuntimeConfig = (): WindowAppConfig => getBrowserWindow()?.__APP_CONFIG__ || {};

const trimValue = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const readConfig = (key: keyof WindowAppConfig, fallback?: string): string | undefined => {
  return trimValue(getRuntimeConfig()[key]) ?? trimValue(fallback);
};

const SHARED_SITE_BASE_URL = "https://flirto.guru";

export const runtimeConfigValues = {
  get appSurface(): string {
    return readConfig("APP_SURFACE", import.meta.env.APP_SURFACE) ?? "pay";
  },
  get apiBaseUrl(): string {
    return readConfig("API_BASE_URL", import.meta.env.API_BASE_URL) ?? "http://localhost:8000";
  },
  get payPublicBaseUrl(): string {
    return readConfig("PAY_PUBLIC_BASE_URL", import.meta.env.PAY_PUBLIC_BASE_URL) ?? "http://localhost:5176";
  },
  get sharedSiteBaseUrl(): string {
    return SHARED_SITE_BASE_URL;
  },
};

export const buildApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, runtimeConfigValues.apiBaseUrl).toString();
};

export const buildPayUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, runtimeConfigValues.payPublicBaseUrl).toString();
};

export const buildSharedSiteUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, runtimeConfigValues.sharedSiteBaseUrl).toString();
};
