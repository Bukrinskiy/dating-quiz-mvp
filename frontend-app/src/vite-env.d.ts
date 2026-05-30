/// <reference types="vite/client" />

interface WindowAppConfig {
  APP_SURFACE?: string;
  API_BASE_URL?: string;
  PAY_PUBLIC_BASE_URL?: string;
  APP_PUBLIC_BASE_URL?: string;
  LANDING_PUBLIC_BASE_URL?: string;
  VAPID_PUBLIC_KEY?: string;
}

interface Window {
  __APP_CONFIG__?: WindowAppConfig;
}
