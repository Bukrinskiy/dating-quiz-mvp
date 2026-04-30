import { loadStripe } from "@stripe/stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import type { CreatePaymentIntentResponse } from "./paymentApi";

const PREWARM_STORAGE_KEY = "quiz_intent_prewarm_v1";
export const QUIZ_INTENT_PREWARM_TTL_MS = 10 * 60 * 1000;

type IntentPrewarmEnvelope = {
  key: string;
  ts: number;
  payload: CreatePaymentIntentResponse;
};

const stripePromiseCache = new Map<string, Promise<Stripe | null>>();

export const getStripeSingleton = (publishableKey: string): Promise<Stripe | null> => {
  const normalizedKey = publishableKey.trim();
  if (!normalizedKey) {
    return Promise.resolve(null);
  }
  const cached = stripePromiseCache.get(normalizedKey);
  if (cached) {
    return cached;
  }
  const promise = loadStripe(normalizedKey);
  stripePromiseCache.set(normalizedKey, promise);
  return promise;
};

export const buildQuizIntentKey = ({
  uuid,
  plan,
  email,
  promo,
  lang,
}: {
  uuid: string;
  plan: string;
  email: string;
  promo?: string;
  lang: string;
}): string => {
  const normalizedPromo = promo?.trim().toUpperCase() ?? "";
  return [uuid.trim(), plan.trim(), email.trim().toLowerCase(), normalizedPromo, lang.trim().toLowerCase()].join("|");
};

export const saveQuizIntentPrewarm = (entry: IntentPrewarmEnvelope): void => {
  try {
    sessionStorage.setItem(PREWARM_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // ignore storage errors
  }
};

export const readQuizIntentPrewarm = (
  key: string,
  ttlMs: number = QUIZ_INTENT_PREWARM_TTL_MS,
): CreatePaymentIntentResponse | null => {
  try {
    const raw = sessionStorage.getItem(PREWARM_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<IntentPrewarmEnvelope>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.key !== "string" ||
      typeof parsed.ts !== "number" ||
      typeof parsed.payload !== "object" ||
      parsed.payload === null
    ) {
      return null;
    }
    if (parsed.key !== key) {
      return null;
    }
    if (Date.now() - parsed.ts > ttlMs) {
      return null;
    }
    return parsed.payload as CreatePaymentIntentResponse;
  } catch {
    return null;
  }
};
