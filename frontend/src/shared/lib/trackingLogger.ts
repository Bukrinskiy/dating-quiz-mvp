import { trackingConfig } from "../config/tracking";

type TrackingLogLevel = "info" | "warn" | "error";

export const logTracking = (scope: string, message: string, details?: unknown, level: TrackingLogLevel = "info"): void => {
  if (!trackingConfig.isTrackingDebug) {
    return;
  }

  const prefix = `[tracking:${scope}] ${message}`;
  if (level === "warn") {
    console.warn(prefix, details ?? "");
    return;
  }
  if (level === "error") {
    console.error(prefix, details ?? "");
    return;
  }
  console.info(prefix, details ?? "");
};

