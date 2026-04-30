import { buildApiUrl } from "../config/runtime";

export type CheckoutMode = "one_time" | "subscription";

export type MoneyAmount = {
  amount_minor: number;
  currency: string;
};

export type PublicPlan = {
  code: string;
  headline: string;
  billing_period: string;
  interval_unit: string;
  interval_count: number;
  price: MoneyAmount;
  compare_at_price: MoneyAmount | null;
  per_day_price: MoneyAmount | null;
  compare_at_per_day_price: MoneyAmount | null;
  badge: string | null;
  is_default: boolean;
  is_highlighted: boolean;
};

export type CheckoutSessionResponse = {
  checkout_url: string;
  session_id: string;
  order_id: string;
};

export type PaymentStatus = {
  payment_status: string;
  fulfillment_status: string;
  access_status: string;
  activation_link: string | null;
};

export type CreatePaymentIntentRequest = {
  plan: string;
  email: string;
  clickid: string;
  locale?: string;
  telegram_chat_id?: string;
  promo_code?: string;
};

export type CreatePaymentIntentResponse = {
  order_id: string;
  client_secret: string;
  customer_id: string;
  publishable_key: string;
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const parseApiError = async (response: Response, fallbackMessage: string): Promise<ApiError> => {
  let code: string | undefined;
  let message = fallbackMessage;
  try {
    const payload = (await response.json()) as { detail?: string | { code?: string; message?: string } };
    if (typeof payload.detail === "string") {
      message = payload.detail;
    } else if (payload.detail && typeof payload.detail === "object") {
      code = payload.detail.code;
      if (payload.detail.message) {
        message = payload.detail.message;
      }
    }
  } catch {
    // Ignore non-JSON errors.
  }
  return new ApiError(message, response.status, code);
};

export const createCheckoutSession = async (payload: {
  mode: CheckoutMode;
  plan: string;
  email: string;
  clickid: string;
  locale?: string;
  telegram_chat_id?: string;
  promo_code?: string;
}): Promise<CheckoutSessionResponse> => {
  const response = await fetch(buildApiUrl("/api/payment/checkout-session"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseApiError(response, `Checkout creation failed (${response.status})`);
  }

  return response.json() as Promise<CheckoutSessionResponse>;
};

export const getPaymentPlans = async (promoCode?: string): Promise<PublicPlan[]> => {
  const path = promoCode
    ? `/api/payment/plans?promo_code=${encodeURIComponent(promoCode)}`
    : "/api/payment/plans";
  const response = await fetch(buildApiUrl(path));
  if (!response.ok) {
    throw await parseApiError(response, `Payment plans failed (${response.status})`);
  }
  return response.json() as Promise<PublicPlan[]>;
};

export const getPaymentSessionStatus = async (sessionId: string): Promise<PaymentStatus> => {
  const response = await fetch(buildApiUrl(`/api/payment/session-status?session_id=${encodeURIComponent(sessionId)}`));
  if (!response.ok) {
    throw new Error(`Session status failed (${response.status})`);
  }
  return response.json() as Promise<PaymentStatus>;
};

export const createPaymentIntent = async (payload: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> => {
  const response = await fetch(buildApiUrl("/api/payment/intent"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseApiError(response, `Payment intent creation failed (${response.status})`);
  }

  return response.json() as Promise<CreatePaymentIntentResponse>;
};

export const getPaymentOrderStatus = async (orderId: string): Promise<PaymentStatus> => {
  const response = await fetch(buildApiUrl(`/api/payment/order-status?order_id=${encodeURIComponent(orderId)}`));
  if (!response.ok) {
    throw new Error(`Order status failed (${response.status})`);
  }
  return response.json() as Promise<PaymentStatus>;
};

export const createCustomerPortal = async (email: string): Promise<{ portal_url: string }> => {
  const response = await fetch(buildApiUrl("/api/payment/customer-portal"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(`Portal create failed (${response.status})`);
  }

  return response.json() as Promise<{ portal_url: string }>;
};
