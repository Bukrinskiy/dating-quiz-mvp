import { buildApiUrl } from "../shared/runtime";
import type {
  AccessStatus,
  AuthPayload,
  Role,
  SessionAssetResponse,
  SessionBatchCloseResponse,
  SessionDeleteAssetResponse,
  SessionDetail,
  SessionGenerateResponse,
  SessionListItem,
  SessionMode,
  SessionRefineResponse,
  SupportResponse,
} from "./types";

type JsonBody = Record<string, unknown> | null;

type RequestOptions = {
  accessToken?: string | null;
  timeoutMs?: number;
  retryOnAuth?: boolean;
};

type AppApiDeps = {
  getAccessToken: () => string | null;
  refreshAuth: () => Promise<AuthPayload | null>;
};

type SessionMeta = {
  role?: Role;
  display_name?: string;
  sent_at?: string;
};

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(message: string, status: number, detail = "") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export class AuthError extends ApiError {
  constructor(detail = "auth_required") {
    super("Authentication required", 401, detail);
    this.name = "AuthError";
  }
}

export class NotFoundError extends ApiError {
  constructor(detail = "not_found") {
    super("Not found", 404, detail);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends ApiError {
  constructor(status = 409, detail = "conflict") {
    super("Conflict", status, detail);
    this.name = "ConflictError";
  }
}

export class TimeoutError extends ApiError {
  constructor() {
    super("Request timed out", 408, "timeout");
    this.name = "TimeoutError";
  }
}

export class ServerError extends ApiError {
  constructor(status = 500, detail = "server_error") {
    super("Server error", status, detail);
    this.name = "ServerError";
  }
}

const makeAbortSignal = (timeoutMs?: number): AbortSignal | undefined => {
  if (!timeoutMs) {
    return undefined;
  }
  return AbortSignal.timeout(timeoutMs);
};

const extractDetail = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { detail?: string };
    return String(payload.detail || "").trim();
  } catch {
    return "";
  }
};

export const apiFetch = async (
  path: string,
  init: RequestInit = {},
  accessToken?: string | null,
): Promise<Response> => {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && !(init.body instanceof FormData) && init.method && init.method !== "GET") {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return fetch(buildApiUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });
};

const parseOrThrow = async <T>(response: Response): Promise<T> => {
  if (response.ok) {
    if (response.status === 204) {
      return null as T;
    }
    return (await response.json()) as T;
  }

  const detail = await extractDetail(response);
  if (response.status === 401) {
    throw new AuthError(detail);
  }
  if (response.status === 403) {
    throw new ConflictError(403, detail || "forbidden");
  }
  if (response.status === 404) {
    throw new NotFoundError(detail);
  }
  if (response.status === 409 || detail.toLowerCase().includes("closed")) {
    throw new ConflictError(response.status, detail || "session_conflict");
  }
  if (response.status >= 500) {
    throw new ServerError(response.status, detail);
  }
  throw new ApiError(detail || "Request failed", response.status, detail);
};

async function requestJson<T>(
  path: string,
  method: string,
  body: JsonBody,
  deps: AppApiDeps,
  options: RequestOptions = {},
): Promise<T> {
  const accessToken = options.accessToken ?? deps.getAccessToken();
  try {
    const response = await apiFetch(
      path,
      {
        method,
        body: body ? JSON.stringify(body) : undefined,
        signal: makeAbortSignal(options.timeoutMs),
      },
      accessToken,
    );
    return await parseOrThrow<T>(response);
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new TimeoutError();
    }
    if (error instanceof AuthError && options.retryOnAuth !== false) {
      const nextAuth = await deps.refreshAuth();
      if (!nextAuth?.tokens.access_token) {
        throw error;
      }
      return requestJson<T>(path, method, body, deps, {
        ...options,
        accessToken: nextAuth.tokens.access_token,
        retryOnAuth: false,
      });
    }
    throw error;
  }
}

async function requestForm<T>(
  path: string,
  formData: FormData,
  deps: AppApiDeps,
  options: RequestOptions = {},
): Promise<T> {
  const accessToken = options.accessToken ?? deps.getAccessToken();
  try {
    const response = await apiFetch(
      path,
      {
        method: "POST",
        body: formData,
        signal: makeAbortSignal(options.timeoutMs),
      },
      accessToken,
    );
    return await parseOrThrow<T>(response);
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new TimeoutError();
    }
    if (error instanceof AuthError && options.retryOnAuth !== false) {
      const nextAuth = await deps.refreshAuth();
      if (!nextAuth?.tokens.access_token) {
        throw error;
      }
      return requestForm<T>(path, formData, deps, {
        ...options,
        accessToken: nextAuth.tokens.access_token,
        retryOnAuth: false,
      });
    }
    throw error;
  }
}

export const createAppApi = (deps: AppApiDeps) => ({
  requestCode: (email: string) => requestJson<{ status: string }>("/api/app/auth/email-code/request", "POST", { email }, deps),
  confirmCode: (email: string, code: string) => requestJson<AuthPayload>("/api/app/auth/email-code/confirm", "POST", { email, code }, deps),
  accessStatus: () => requestJson<AccessStatus>("/api/app/access-status", "GET", null, deps),
  startSession: (mode: SessionMode) => requestJson<{ session_id: string }>("/api/app/session/start", "POST", { mode }, deps),
  listSessions: () => requestJson<SessionListItem[]>("/api/app/sessions", "GET", null, deps),
  getSessionDetail: (sessionId: string) => requestJson<SessionDetail>(`/api/app/session/${sessionId}`, "GET", null, deps),
  sendText: (sessionId: string, payload: { text: string } & SessionMeta) =>
    requestJson<SessionAssetResponse>(`/api/app/session/${sessionId}/asset-text`, "POST", payload, deps),
  sendMedia: (sessionId: string, kind: "image" | "audio", file: File, meta: SessionMeta) => {
    const formData = new FormData();
    formData.append("file", file);
    if (meta.role) {
      formData.append("role", meta.role);
    }
    if (meta.display_name) {
      formData.append("display_name", meta.display_name);
    }
    if (meta.sent_at) {
      formData.append("sent_at", meta.sent_at);
    }
    return requestForm<SessionAssetResponse>(`/api/app/session/${sessionId}/asset-${kind}`, formData, deps, {
      timeoutMs: 60000,
    });
  },
  closeBatch: (sessionId: string) =>
    requestJson<SessionBatchCloseResponse>(`/api/app/session/${sessionId}/batch/close`, "POST", null, deps),
  deleteAsset: (sessionId: string, assetId: string) =>
    requestJson<SessionDeleteAssetResponse>(`/api/app/session/${sessionId}/asset/${assetId}`, "DELETE", null, deps),
  deleteMessage: (sessionId: string, messageId: string) =>
    requestJson<SessionDeleteAssetResponse>(`/api/app/session/${sessionId}/message/${messageId}`, "DELETE", null, deps),
  confirmContext: (sessionId: string, action: "confirm:yes" | "confirm:edit", editText?: string) =>
    requestJson<SessionBatchCloseResponse>(`/api/app/session/${sessionId}/confirm-context`, "POST", {
      action,
      edit_text: action === "confirm:edit" ? editText || "" : null,
    }, deps),
  generate: (sessionId: string) =>
    requestJson<SessionGenerateResponse>(`/api/app/session/${sessionId}/generate`, "POST", {}, deps, {
      timeoutMs: 60000,
    }),
  refine: (sessionId: string, command: string) =>
    requestJson<SessionRefineResponse>(`/api/app/session/${sessionId}/refine`, "POST", { command }, deps, {
      timeoutMs: 60000,
    }),
  resetSession: (sessionId: string) =>
    requestJson<{ session_id: string; status: string }>(`/api/app/session/${sessionId}/reset`, "POST", null, deps),
  resetActive: () =>
    requestJson<{ status: string; closed_sessions: number }>("/api/app/session/reset-active", "POST", null, deps),
  submitSupport: (text: string) => requestJson<SupportResponse>("/api/app/support", "POST", { text }, deps),
});

const asLines = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((item) => String(item).trim())
        .filter(Boolean)
    : [];

export const asTextList = (value: unknown): string[] => asLines(value);

export const formatUiPayloadText = (payload: Record<string, unknown>): string => {
  if ("primary_message" in payload) {
    return [
      `Сообщение:\n${String(payload.primary_message || "")}`,
      `Почему:\n${String(payload.why || "")}`,
      `Риски:\n${asLines(payload.risks).map((item) => `- ${item}`).join("\n") || "- нет"}`,
      `Избегать:\n${asLines(payload.avoid_list).map((item) => `- ${item}`).join("\n") || "- нет"}`,
      `Следующий шаг:\n${String(payload.next_step || "")}`,
      `Простой вариант:\n${String(payload.fallback_simple_version || "")}`,
      `Альтернативы:\n${asLines(payload.alternatives).map((item) => `- ${item}`).join("\n") || "- нет"}`,
    ].join("\n\n");
  }

  return [
    `Диагноз:\n${String(payload.diagnosis || "")}`,
    `Точка рычага:\n${String(payload.core_leverage || "")}`,
    `План 24ч:\n${asLines(payload.plan_24h).map((item) => `- ${item}`).join("\n") || "- нет"}`,
    `Если ответит:\n${asLines(payload.plan_if_reply).map((item) => `- ${item}`).join("\n") || "- нет"}`,
    `Если не ответит:\n${asLines(payload.plan_if_no_reply).map((item) => `- ${item}`).join("\n") || "- нет"}`,
    `Шаблон:\n${String(payload.message_template || "")}`,
    `Избегать:\n${asLines(payload.avoid_list).map((item) => `- ${item}`).join("\n") || "- нет"}`,
  ].join("\n\n");
};
