import type { CreatePaymentIntentResponse, PublicPlan } from "./paymentApi";
import { buildApiUrl } from "../config/runtime";

export type QuizSessionCreatePayload = {
  locale?: string;
  currency?: string;
  answers?: Record<string, unknown>;
  clickid?: string;
  brand?: string;
  landing_id?: string;
  entry_host?: string;
  entry_path?: string;
  tracking_params?: Record<string, string>;
};

export type QuizSessionCreateResponse = {
  uuid: string;
};

export type QuizSessionCurrencyResponse = {
  currency: string;
  locale: string;
};

export type QuizSessionPlanDataResponse = {
  uuid: string;
  locale: string;
  currency: string;
  email: string | null;
  plans: PublicPlan[];
};

export type QuizSessionIntentRequest = {
  uuid: string;
  plan: string;
  email: string;
  promo_code?: string;
  clickid?: string;
  locale?: string;
  telegram_chat_id?: string;
  brand?: string;
  landing_id?: string;
  entry_host?: string;
  entry_path?: string;
};

const parseErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const payload = (await response.json()) as { detail?: string | { message?: string } };
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
    if (payload.detail && typeof payload.detail === "object" && typeof payload.detail.message === "string") {
      return payload.detail.message;
    }
  } catch {
    // ignore decode errors
  }
  return fallback;
};

export const getSessionCurrency = async (locale?: string): Promise<QuizSessionCurrencyResponse> => {
  const response = await fetch(buildApiUrl("/api/session/get-currency2"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale }),
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, `Currency resolve failed (${response.status})`));
  }
  return response.json() as Promise<QuizSessionCurrencyResponse>;
};

export const createQuizSession = async (payload: QuizSessionCreatePayload): Promise<QuizSessionCreateResponse> => {
  const response = await fetch(buildApiUrl("/api/session/create"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, `Session create failed (${response.status})`));
  }
  return response.json() as Promise<QuizSessionCreateResponse>;
};

export const updateQuizSessionEmail = async (uuid: string, email: string): Promise<{ ok: boolean }> => {
  const response = await fetch(buildApiUrl("/api/session/update-email"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uuid, email }),
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, `Email update failed (${response.status})`));
  }
  return response.json() as Promise<{ ok: boolean }>;
};

export const getQuizSessionPlanData = async (uuid: string, promoCode?: string): Promise<QuizSessionPlanDataResponse> => {
  const response = await fetch(buildApiUrl("/api/session/get-plan-data"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uuid, promo_code: promoCode }),
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, `Session plan data failed (${response.status})`));
  }
  return response.json() as Promise<QuizSessionPlanDataResponse>;
};

export const createQuizSessionIntent = async (payload: QuizSessionIntentRequest): Promise<CreatePaymentIntentResponse> => {
  const response = await fetch(buildApiUrl("/api/session/create-payment-intent"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, `Session intent failed (${response.status})`));
  }
  return response.json() as Promise<CreatePaymentIntentResponse>;
};
