import { getClickId, getTrackingParams } from "../../entities/tracking-attribution/model";
import { buildApiUrl } from "../config/runtime";
import { logTracking } from "./trackingLogger";

export const track = (event: string): void => {
  // Keep console tracking for MVP diagnostics.
  console.info("track", event);
  logTracking("event", "track called", { event });
};

type PostbackDedupeOptions = {
  sessionId?: string | null;
  trackingParams?: Record<string, string>;
  forceSend?: boolean;
};
type MobiStatus = string;

const pendingImageBeacons = new Set<HTMLImageElement>();
const pendingPostbackKeys = new Set<string>();

const RELAY_ENDPOINT = buildApiUrl("/api/events/mobi-slon");
const BINOM_GA_LINK_ENDPOINT = buildApiUrl("/api/events/binom-ga-link");
const FALLBACK_CLICKID = "conversion_pixel";

const pendingGaLinkKeys = new Set<string>();

const isMobiDebugEnabled = (): boolean => {
  try {
    const search = new URLSearchParams(window.location.search);
    const debugParam = search.get("mobi_debug");
    if (debugParam === "1") {
      localStorage.setItem("mobi_debug", "1");
      return true;
    }
    if (debugParam === "0") {
      localStorage.removeItem("mobi_debug");
      return false;
    }
    return localStorage.getItem("mobi_debug") === "1";
  } catch {
    return false;
  }
};

const debugMobi = (message: string, details?: unknown): void => {
  if (!isMobiDebugEnabled()) {
    return;
  }
  console.info(`[mobi-debug] ${message}`, details ?? "");
};

const resolveClickId = (search: string): string => {
  const clickId = getClickId(search)?.trim();
  if (clickId) {
    debugMobi("clickid resolved", { clickId, source: "tokens/cookie/query" });
    return clickId;
  }
  debugMobi("clickid missing, fallback used", { fallback: FALLBACK_CLICKID });
  return FALLBACK_CLICKID;
};

const buildTrackingPayload = (
  status: MobiStatus,
  search: string,
  sessionId?: string | null,
  trackingParamsOverride?: Record<string, string>,
) => {
  if (!status) {
    return null;
  }
  const clickId = resolveClickId(search);
  const trackingParams = getTrackingParams(search);
  const extraParams: Record<string, string> = {};

  trackingParams.forEach((value, key) => {
    if (key === "cnv_id" || key === "payout" || key === "cnv_status") {
      return;
    }
    const normalizedValue = value.trim();
    if (!normalizedValue) {
      return;
    }
    extraParams[key] = normalizedValue;
  });
  if (trackingParamsOverride) {
    Object.entries(trackingParamsOverride).forEach(([key, value]) => {
      const normalizedKey = key.trim();
      const normalizedValue = value.trim();
      if (!normalizedKey || !normalizedValue || normalizedKey === "cnv_id" || normalizedKey === "payout" || normalizedKey === "cnv_status") {
        return;
      }
      extraParams[normalizedKey] = normalizedValue;
    });
  }

  return {
    status,
    clickid: clickId,
    session_id: sessionId?.trim() || null,
    page_path: `${window.location.pathname}${window.location.search}`,
    tracking_params: extraParams,
  };
};

const sendImageBeacon = (url: string): boolean => {
  const img = new Image();
  pendingImageBeacons.add(img);
  img.referrerPolicy = "no-referrer-when-downgrade";
  img.onload = () => pendingImageBeacons.delete(img);
  img.onerror = () => pendingImageBeacons.delete(img);
  img.src = url;
  logTracking("mobi-slon", "image beacon sent", { url });
  return true;
};

const sendPostback = async (status: MobiStatus, search: string, options?: PostbackDedupeOptions): Promise<boolean> => {
  const payload = buildTrackingPayload(status, search, options?.sessionId, options?.trackingParams);
  if (!payload) {
    logTracking("mobi-slon", "skip postback: missing clickId or status", { status }, "warn");
    return false;
  }
  const requestBody = JSON.stringify(payload);
  debugMobi("sendPostback start", payload);
  logTracking("mobi-slon", "sending postback relay", {
    status,
    clickId: payload.clickid,
    sessionId: payload.session_id,
    pagePath: payload.page_path,
  });

  if (typeof fetch === "function") {
    try {
      const response = await fetch(RELAY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: requestBody,
      });
      if (response.ok) {
        debugMobi("fetch relay success", { status, code: response.status });
        logTracking("mobi-slon", "fetch relay accepted", { status, clickId: payload.clickid });
        return true;
      }
      debugMobi("fetch relay non-2xx", { status, code: response.status });
      logTracking("mobi-slon", "fetch relay bad status", { status, code: response.status }, "warn");
    } catch (error) {
      debugMobi("fetch relay error", { status, error: String(error) });
      logTracking("mobi-slon", "fetch relay failed", { status, error: String(error) }, "warn");
    }
  }

  if (navigator.sendBeacon) {
    try {
      const sent = navigator.sendBeacon(RELAY_ENDPOINT, new Blob([requestBody], { type: "application/json" }));
      debugMobi("sendBeacon relay result", { status, sent });
      logTracking("mobi-slon", "sendBeacon relay result", { status, sent });
      if (sent) {
        return true;
      }
    } catch (error) {
      logTracking("mobi-slon", "sendBeacon relay failed", { status, error: String(error) }, "warn");
    }
  }

  const fallbackUrl = new URL(RELAY_ENDPOINT);
  fallbackUrl.searchParams.set("status", payload.status);
  fallbackUrl.searchParams.set("clickid", payload.clickid);
  if (payload.session_id) {
    fallbackUrl.searchParams.set("session_id", payload.session_id);
  }
  if (payload.page_path) {
    fallbackUrl.searchParams.set("page_path", payload.page_path);
  }
  Object.entries(payload.tracking_params).forEach(([key, value]) => {
    fallbackUrl.searchParams.set(key, value);
  });
  debugMobi("fallback image relay", { status, url: fallbackUrl.toString() });
  return sendImageBeacon(fallbackUrl.toString());
};

export const sendPostbackOnce = (status: MobiStatus, search: string, options?: PostbackDedupeOptions): void => {
  const clickId = resolveClickId(search);
  const forceSend = options?.forceSend ?? new URLSearchParams(search).get("force_postback") === "1";

  const normalizedSessionId = options?.sessionId?.trim() || "global";
  const key = `postback_sent_${status}_${clickId}_${normalizedSessionId}`;
  debugMobi("sendPostbackOnce called", { status, key, forceSend, search });

  if (!forceSend && pendingPostbackKeys.has(key)) {
    debugMobi("skip in-flight duplicate", { status, key });
    logTracking("mobi-slon", "skip duplicate postback: in flight", { status, key, sessionId: normalizedSessionId });
    return;
  }

  if (!forceSend) {
    try {
      if (sessionStorage.getItem(key) === "1") {
        debugMobi("skip stored duplicate", { status, key });
        logTracking("mobi-slon", "skip duplicate postback", { status, key, sessionId: normalizedSessionId });
        return;
      }
    } catch {
      // ignore storage errors
      logTracking("mobi-slon", "sessionStorage read failed", { status, key, sessionId: normalizedSessionId }, "warn");
    }
  }

  pendingPostbackKeys.add(key);

  void sendPostback(status, search, options)
    .then((sent) => {
      if (!sent) {
        debugMobi("postback failed", { status, key });
        logTracking("mobi-slon", "postback send returned false", { status, key }, "warn");
        return;
      }

      if (!forceSend) {
        try {
          sessionStorage.setItem(key, "1");
          debugMobi("postback marked as sent", { status, key });
          logTracking("mobi-slon", "postback marked as sent", { status, key, sessionId: normalizedSessionId });
        } catch {
          // ignore storage errors
          logTracking("mobi-slon", "sessionStorage write failed", { status, key, sessionId: normalizedSessionId }, "warn");
        }
      }
    })
    .finally(() => {
      pendingPostbackKeys.delete(key);
    });
};

export const linkGaClientIdOnce = (
  clickid: string,
  gaClientId: string,
  sessionId?: string | null,
): void => {
  const trimmedClickid = clickid.trim();
  const trimmedClientId = gaClientId.trim();
  if (!trimmedClickid || !trimmedClientId) {
    return;
  }

  const normalizedSessionId = sessionId?.trim() || "global";
  const key = `ga_link_sent_${trimmedClickid}_${trimmedClientId}_${normalizedSessionId}`;

  if (pendingGaLinkKeys.has(key)) {
    return;
  }
  try {
    if (sessionStorage.getItem(key) === "1") {
      return;
    }
  } catch {
    // ignore storage errors
  }

  pendingGaLinkKeys.add(key);

  const payload = {
    clickid: trimmedClickid,
    ga_client_id: trimmedClientId,
    session_id: sessionId?.trim() || null,
    page_path: `${window.location.pathname}${window.location.search}`,
  };
  const body = JSON.stringify(payload);
  logTracking("binom-ga-link", "sending ga client_id link", {
    clickid: trimmedClickid,
    sessionId: normalizedSessionId,
  });

  void fetch(BINOM_GA_LINK_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body,
  })
    .then((response) => {
      if (!response.ok) {
        logTracking(
          "binom-ga-link",
          "relay bad status",
          { code: response.status, clickid: trimmedClickid },
          "warn",
        );
        return;
      }
      try {
        sessionStorage.setItem(key, "1");
      } catch {
        // ignore storage errors
      }
      logTracking("binom-ga-link", "relay accepted", { clickid: trimmedClickid });
    })
    .catch((error: unknown) => {
      logTracking(
        "binom-ga-link",
        "relay failed",
        { error: String(error), clickid: trimmedClickid },
        "warn",
      );
    })
    .finally(() => {
      pendingGaLinkKeys.delete(key);
    });
};
