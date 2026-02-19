const TRACKING_PARAMS_STORAGE_KEY = "tracking_query_params";

const getCookieValue = (name: string): string | null => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  if (!match?.[1]) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

const readStoredTrackingParams = (): URLSearchParams => {
  try {
    const raw = sessionStorage.getItem(TRACKING_PARAMS_STORAGE_KEY);
    if (!raw) {
      return new URLSearchParams();
    }
    return new URLSearchParams(raw);
  } catch {
    return new URLSearchParams();
  }
};

const saveTrackingParams = (params: URLSearchParams): void => {
  try {
    sessionStorage.setItem(TRACKING_PARAMS_STORAGE_KEY, params.toString());
  } catch {
    // ignore storage errors
  }
};

export const getTrackingParams = (search: string): URLSearchParams => {
  const merged = readStoredTrackingParams();
  const incoming = new URLSearchParams(search);

  incoming.forEach((value, key) => {
    merged.set(key, value);
  });

  saveTrackingParams(merged);
  return merged;
};

export const getClickId = (search: string): string | null => {
  const tokens = (window as Window & { tokens?: { clickid?: string; bcid?: string } }).tokens;
  if (tokens?.clickid) {
    return tokens.clickid;
  }
  if (tokens?.bcid) {
    return tokens.bcid;
  }

  const cookieClickId = getCookieValue("clickid");
  if (cookieClickId) {
    return cookieClickId;
  }

  const cookieBcid = getCookieValue("bcid");
  if (cookieBcid) {
    return cookieBcid;
  }

  const params = getTrackingParams(search);
  return params.get("clickid") || params.get("bcid");
};

export const addClickIdToPath = (path: string, search: string): string => {
  const params = getTrackingParams(search);
  if ([...params.keys()].length === 0) {
    return path;
  }

  const url = new URL(path, window.location.origin);
  params.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  return `${url.pathname}${url.search}`;
};

const addClickIdToUrl = (rawUrl: string, clickId: string): string => {
  if (!rawUrl || /^(mailto:|tel:|javascript:|#)/i.test(rawUrl)) {
    return rawUrl;
  }

  try {
    const resolved = new URL(rawUrl, window.location.href);
    resolved.searchParams.set("clickid", clickId);
    return resolved.toString();
  } catch {
    return rawUrl;
  }
};

export const propagateClickIdToLinks = (search: string): void => {
  const clickId = getClickId(search);
  if (!clickId) {
    return;
  }

  const links = document.querySelectorAll<HTMLAnchorElement>("a[href]");
  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) {
      return;
    }

    const withClickId = addClickIdToUrl(href, clickId);
    if (withClickId !== href) {
      link.setAttribute("href", withClickId);
    }
  });
};
