type AppConfig = {
  appSurface: string;
  appBrand: string;
  apiBaseUrl: string;
  primaryLandingUrl: string;
};

const fallbackLandingUrl = "https://lp1.flirto.guru/en/quiz/1";

export const runtimeConfig: AppConfig = {
  appSurface: window.__APP_CONFIG__?.APP_SURFACE?.trim() || "site",
  appBrand: window.__APP_CONFIG__?.APP_BRAND?.trim() || "Flirto Guru",
  apiBaseUrl: window.__APP_CONFIG__?.API_BASE_URL?.trim() || "https://api.flirto.guru",
  primaryLandingUrl: window.__APP_CONFIG__?.PRIMARY_LANDING_URL?.trim() || fallbackLandingUrl,
};
