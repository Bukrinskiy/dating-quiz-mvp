const parseBooleanEnv = (value: string | undefined): boolean => {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return true;
  }
  if (normalized === "false" || normalized === "0") {
    return false;
  }

  return false;
};

const runtimeConfig = window.__APP_CONFIG__ || {};
const getConfigValue = (key: keyof WindowAppConfig, fallback?: string): string | undefined => {
  const runtimeValue = runtimeConfig[key];
  if (typeof runtimeValue === "string" && runtimeValue.length > 0) {
    return runtimeValue;
  }
  return fallback;
};

export const trackingConfig = {
  mobiSlonUrl: getConfigValue("VITE_MOBI_SLON_URL", import.meta.env.VITE_MOBI_SLON_URL) || "https://mobi-slon.com/index.php",
  mobiSlonCampaignKey: getConfigValue("VITE_MOBI_SLON_CAMPAIGN_KEY", import.meta.env.VITE_MOBI_SLON_CAMPAIGN_KEY) || "",
  fbPixelId: getConfigValue("VITE_FB_PIXEL_ID", import.meta.env.VITE_FB_PIXEL_ID) || "",
  isTrackingDebug: parseBooleanEnv(getConfigValue("VITE_TRACKING_DEBUG", import.meta.env.VITE_TRACKING_DEBUG)),
};
