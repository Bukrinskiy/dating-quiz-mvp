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
