import { buildApiUrl } from "../config/runtime";

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

export const postJson = async <TResponse, TPayload = unknown>(path: string, payload: TPayload): Promise<TResponse> => {
  const response = await fetch(buildApiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, `Request failed (${response.status})`));
  }

  return response.json() as Promise<TResponse>;
};
