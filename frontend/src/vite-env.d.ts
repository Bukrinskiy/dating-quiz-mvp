/// <reference types="vite/client" />

interface WindowAppConfig {
  VITE_MOBI_SLON_URL?: string;
  VITE_MOBI_SLON_CAMPAIGN_KEY?: string;
  VITE_FB_PIXEL_ID?: string;
  VITE_YANDEX_METRIKA_ID?: string;
  VITE_TRACKING_DEBUG?: string;
  VITE_TELEGRAM_BOT_URL?: string;
}

interface ImportMetaEnv {
  readonly VITE_MOBI_SLON_URL?: string;
  readonly VITE_MOBI_SLON_CAMPAIGN_KEY?: string;
  readonly VITE_FB_PIXEL_ID?: string;
  readonly VITE_YANDEX_METRIKA_ID?: string;
  readonly VITE_TRACKING_DEBUG?: string;
  readonly VITE_TELEGRAM_BOT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __APP_CONFIG__?: WindowAppConfig;
  ym?: (...args: unknown[]) => void;
}
