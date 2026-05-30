/// <reference types="vite/client" />

interface Window {
  __APP_CONFIG__?: {
    APP_SURFACE?: string;
    APP_BRAND?: string;
    API_BASE_URL?: string;
    APP_PUBLIC_BASE_URL?: string;
    PRIMARY_LANDING_URL?: string;
  };
}
