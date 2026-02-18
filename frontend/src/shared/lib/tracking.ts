import { getClickId } from "./clickid";

const POSTBACK_URL = "https://mobi-slon.com/index.php";

export const track = (event: string): void => {
  // Keep console tracking for MVP diagnostics.
  console.info("track", event);
};

const sendPostback = (status: string, search: string): void => {
  const clickId = getClickId(search);
  if (!clickId || !status) {
    return;
  }

  const url = new URL(POSTBACK_URL);
  url.searchParams.set("cnv_id", clickId);
  url.searchParams.set("payout", "0");
  url.searchParams.set("cnv_status", status);

  if (navigator.sendBeacon) {
    navigator.sendBeacon(url.toString());
    return;
  }

  const img = new Image();
  img.referrerPolicy = "no-referrer-when-downgrade";
  img.src = url.toString();
};

export const sendPostbackOnce = (status: string, search: string): void => {
  const key = `postback_sent_${status}`;

  try {
    if (sessionStorage.getItem(key) === "1") {
      return;
    }
  } catch {
    // ignore storage errors
  }

  sendPostback(status, search);

  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // ignore storage errors
  }
};
