import { getClickId, getTrackingParams } from "./clickid";
import { trackingConfig } from "../config/tracking";
import { logTracking } from "./trackingLogger";

const POSTBACK_URL = trackingConfig.mobiSlonUrl;

export const track = (event: string): void => {
  // Keep console tracking for MVP diagnostics.
  console.info("track", event);
  logTracking("event", "track called", { event });
};

const sendPostback = (status: string, search: string): boolean => {
  const clickId = getClickId(search);
  if (!clickId || !status) {
    logTracking("mobi-slon", "skip postback: missing clickId or status", { clickId, status }, "warn");
    return false;
  }

  const url = new URL(POSTBACK_URL);
  url.searchParams.set("cnv_id", clickId);
  url.searchParams.set("payout", "0");
  url.searchParams.set("cnv_status", status);
  const trackingParams = getTrackingParams(search);

  trackingParams.forEach((value, key) => {
    if (key === "cnv_id" || key === "payout" || key === "cnv_status") {
      return;
    }
    url.searchParams.set(key, value);
  });

  const postbackUrl = url.toString();
  logTracking("mobi-slon", "sending postback", { status, clickId, url: postbackUrl });

  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon(postbackUrl);
    logTracking("mobi-slon", "sendBeacon result", { status, sent });
    return sent;
  }

  const img = new Image();
  img.referrerPolicy = "no-referrer-when-downgrade";
  img.src = postbackUrl;
  logTracking("mobi-slon", "image beacon sent", { status, url: postbackUrl });
  return true;
};

export const sendPostbackOnce = (status: string, search: string): void => {
  const clickId = getClickId(search);
  if (!clickId) {
    logTracking("mobi-slon", "skip sendPostbackOnce: missing clickId", { status }, "warn");
    return;
  }

  const key = `postback_sent_${status}`;

  try {
    if (sessionStorage.getItem(key) === "1") {
      logTracking("mobi-slon", "skip duplicate postback", { status, key });
      return;
    }
  } catch {
    // ignore storage errors
    logTracking("mobi-slon", "sessionStorage read failed", { status, key }, "warn");
  }

  const sent = sendPostback(status, search);
  if (!sent) {
    logTracking("mobi-slon", "postback send returned false", { status }, "warn");
    return;
  }

  try {
    sessionStorage.setItem(key, "1");
    logTracking("mobi-slon", "postback marked as sent", { status, key });
  } catch {
    // ignore storage errors
    logTracking("mobi-slon", "sessionStorage write failed", { status, key }, "warn");
  }
};
