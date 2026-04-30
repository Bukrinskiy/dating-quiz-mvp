import type { LandingManifest } from "../../../entities/landing-manifest";
import { getTrackingAttribution } from "../../../entities/tracking-attribution/model";
import type { QuizLang } from "../../../shared/config/routes";
import { buildPayUrl } from "../../../shared/config/runtime";

type BuildPayHandoffUrlParams = {
  lang: QuizLang;
  sessionId: string;
  manifest: LandingManifest;
  search: string;
};

export const buildPayHandoffUrl = ({
  lang,
  sessionId,
  manifest,
  search,
}: BuildPayHandoffUrlParams): string => {
  const url = new URL(buildPayUrl(`/${lang}/checkout/${sessionId}`));
  const { params, clickId, bcid } = getTrackingAttribution(search);

  params.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  if (clickId) {
    url.searchParams.set("clickid", clickId);
  }
  if (bcid) {
    url.searchParams.set("bcid", bcid);
  }
  url.searchParams.set("session_id", sessionId);
  url.searchParams.set("landing_id", manifest.landing_id);
  url.searchParams.set("entry_host", window.location.host);
  url.searchParams.set("entry_path", window.location.pathname);
  url.searchParams.set("lang", lang);

  return url.toString();
};
