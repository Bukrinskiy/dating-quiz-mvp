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

export type PaymentSessionStatus = {
  payment_status: string;
  fulfillment_status: string;
  access_status: string;
  activation_link: string | null;
};

export const createCheckoutSession = async (payload: {
  mode: CheckoutMode;
  plan: string;
  email: string;
  clickid: string;
  locale?: string;
  telegram_chat_id?: string;
}): Promise<CheckoutSessionResponse> => {
  const response = await fetch("/api/payment/checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Checkout creation failed (${response.status})`);
  }

  return response.json() as Promise<CheckoutSessionResponse>;
};

export const getPaymentPlans = async (): Promise<PublicPlan[]> => {
  const response = await fetch("/api/payment/plans");
  if (!response.ok) {
    throw new Error(`Payment plans failed (${response.status})`);
  }
  return response.json() as Promise<PublicPlan[]>;
};

export const getPaymentSessionStatus = async (sessionId: string): Promise<PaymentSessionStatus> => {
  const response = await fetch(`/api/payment/session-status?session_id=${encodeURIComponent(sessionId)}`);
  if (!response.ok) {
    throw new Error(`Session status failed (${response.status})`);
  }
  return response.json() as Promise<PaymentSessionStatus>;
};

export const createCustomerPortal = async (email: string): Promise<{ portal_url: string }> => {
  const response = await fetch("/api/payment/customer-portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(`Portal create failed (${response.status})`);
  }

  return response.json() as Promise<{ portal_url: string }>;
};
