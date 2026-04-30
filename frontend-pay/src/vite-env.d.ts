/// <reference types="vite/client" />

interface WindowAppConfig {
  APP_SURFACE?: string;
  API_BASE_URL?: string;
  PAY_PUBLIC_BASE_URL?: string;
  VITE_TELEGRAM_BOT_URL?: string;
  VITE_YANDEX_METRIKA_ID?: string;
  VITE_TRACKING_DEBUG?: string;
}

interface ImportMetaEnv {
  readonly APP_SURFACE?: string;
  readonly API_BASE_URL?: string;
  readonly PAY_PUBLIC_BASE_URL?: string;
  readonly VITE_TELEGRAM_BOT_URL?: string;
  readonly VITE_YANDEX_METRIKA_ID?: string;
  readonly VITE_TRACKING_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __APP_CONFIG__?: WindowAppConfig;
  ym?: (...args: unknown[]) => void;
}
