import { postJson } from "../../../shared/api/http";
import type {
  QuizSessionCreatePayload,
  QuizSessionCreateResponse,
  QuizSessionCurrencyResponse,
} from "../model/types";

export const getSessionCurrency = async (locale?: string): Promise<QuizSessionCurrencyResponse> =>
  postJson<QuizSessionCurrencyResponse, { locale?: string }>("/api/session/get-currency2", { locale });

export const createQuizSession = async (payload: QuizSessionCreatePayload): Promise<QuizSessionCreateResponse> =>
  postJson<QuizSessionCreateResponse, QuizSessionCreatePayload>("/api/session/create", payload);

export const updateQuizSessionEmail = async (uuid: string, email: string): Promise<{ ok: boolean }> =>
  postJson<{ ok: boolean }, { uuid: string; email: string }>("/api/session/update-email", { uuid, email });
