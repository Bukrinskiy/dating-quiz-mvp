export const getClickId = (search: string): string | null => {
  const tokens = (window as Window & { tokens?: { clickid?: string; bcid?: string } }).tokens;
  if (tokens?.clickid) {
    return tokens.clickid;
  }
  if (tokens?.bcid) {
    return tokens.bcid;
  }

  const params = new URLSearchParams(search);
  return params.get("clickid") || params.get("bcid");
};

export const addClickIdToPath = (path: string, search: string): string => {
  const clickId = getClickId(search);
  if (!clickId) {
    return path;
  }

  const url = new URL(path, window.location.origin);
  url.searchParams.set("clickid", clickId);
  return `${url.pathname}${url.search}`;
};
