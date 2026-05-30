import { buildLandingUrl } from "../../shared/runtime";
import type { QuizSessionCreatePayload } from "../api";

export const APP_ACCESS_CHECKOUT_ATTRIBUTION = {
  clickid: "app_access",
  brand: "flirto_guru",
  landingId: "app_access",
  source: "app",
  surface: "frontend-app",
  flow: "access_paywall",
} as const;

export function buildAppAccessQuizSessionPayload(entryHost: string): QuizSessionCreatePayload {
  return {
    locale: "en",
    clickid: APP_ACCESS_CHECKOUT_ATTRIBUTION.clickid,
    brand: APP_ACCESS_CHECKOUT_ATTRIBUTION.brand,
    landing_id: APP_ACCESS_CHECKOUT_ATTRIBUTION.landingId,
    entry_host: entryHost,
    entry_path: "/paywall",
    tracking_params: {
      source: APP_ACCESS_CHECKOUT_ATTRIBUTION.source,
      surface: APP_ACCESS_CHECKOUT_ATTRIBUTION.surface,
      flow: APP_ACCESS_CHECKOUT_ATTRIBUTION.flow,
    },
    answers: {
      source: APP_ACCESS_CHECKOUT_ATTRIBUTION.clickid,
      app_access_checkout: true,
    },
  };
}

export function buildAppAccessEmailUrl(sessionId: string, email: string) {
  const url = new URL(buildLandingUrl(`/en/quiz/email/${sessionId}`));
  url.searchParams.set("email", email);
  url.searchParams.set("clickid", APP_ACCESS_CHECKOUT_ATTRIBUTION.clickid);
  url.searchParams.set("source", APP_ACCESS_CHECKOUT_ATTRIBUTION.source);
  url.searchParams.set("flow", APP_ACCESS_CHECKOUT_ATTRIBUTION.flow);
  return url.toString();
}
