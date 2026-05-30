import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { ServerError, createAppApi } from "../api";
import { useSession } from "./useSession";

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return {
    ...actual,
    createAppApi: vi.fn(),
  };
});

const mockedCreateAppApi = vi.mocked(createAppApi);

const authApi = {
  auth: {
    user: { id: "1", email: "a@b.c", locale: "ru" },
    tokens: { access_token: "token", expires_in: 3600 },
    access: { has_access: true, access_status: "active" },
  },
  setAuth: vi.fn(),
  refreshAuth: vi.fn(async () => null),
  logout: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

test("useSession deletes message optimistically and returns collect stage", async () => {
  mockedCreateAppApi.mockReturnValue({
    sendText: vi.fn(),
    sendMedia: vi.fn(),
    closeBatch: vi.fn(),
    deleteAsset: vi.fn(),
    deleteMessage: vi.fn(async () => ({
      session_id: "s1",
      asset_id: "m1",
      message_id: "m1",
      deleted: true,
      remaining_items: 1,
      state: "collecting_context",
      context_preview: "Второй фрагмент",
    })),
    confirmContext: vi.fn(),
    generate: vi.fn(),
    refine: vi.fn(),
    resetSession: vi.fn(),
    resetActive: vi.fn(),
    startSession: vi.fn(),
    getSessionDetail: vi.fn(async () => ({
      session_id: "s1",
      mode: "write_now",
      status: "active",
      state: "awaiting_context_confirmation",
      context_preview: "Первый фрагмент\nВторой фрагмент",
      messages: [
        { id: "m1", kind: "text", role: "USER_SELF", text: "Первый фрагмент" },
        { id: "m2", kind: "text", role: "USER_SELF", text: "Второй фрагмент" },
      ],
      ui_payload: null,
      editable: true,
      created_at: "2026-04-20T10:00:00.000Z",
      updated_at: "2026-04-20T10:00:00.000Z",
    })),
    listSessions: vi.fn(),
    submitSupport: vi.fn(),
    requestCode: vi.fn(),
    confirmCode: vi.fn(),
    accessStatus: vi.fn(),
  } as ReturnType<typeof createAppApi>);

  const { result } = renderHook(() =>
    useSession({
      sessionId: "s1",
      mode: "write_now",
      authApi,
      onRestartSession: vi.fn(),
      onForbidden: vi.fn(),
      onToast: vi.fn(),
      trackThinking: (promise) => promise,
    }),
  );

  await waitFor(() => {
    expect(result.current.stage).toBe("confirm");
    expect(result.current.messages).toHaveLength(2);
  });

  await act(async () => {
    await result.current.actions.deleteMessage("m1");
  });

  await waitFor(() => {
    expect(result.current.stage).toBe("collect");
    expect(result.current.contextPreview).toBe("Второй фрагмент");
    expect(result.current.messages.map((item) => item.id)).toEqual(["m2"]);
  });
});

test("useSession rolls back deleted message when api fails", async () => {
  const onToast = vi.fn();

  mockedCreateAppApi.mockReturnValue({
    sendText: vi.fn(),
    sendMedia: vi.fn(),
    closeBatch: vi.fn(),
    deleteAsset: vi.fn(),
    deleteMessage: vi.fn(async () => {
      throw new ServerError(500, "boom");
    }),
    confirmContext: vi.fn(),
    generate: vi.fn(),
    refine: vi.fn(),
    resetSession: vi.fn(),
    resetActive: vi.fn(),
    startSession: vi.fn(),
    getSessionDetail: vi.fn(async () => ({
      session_id: "s1",
      mode: "write_now",
      status: "active",
      state: "collecting_context",
      context_preview: "Первый фрагмент",
      messages: [{ id: "m1", kind: "text", role: "USER_SELF", text: "Первый фрагмент" }],
      ui_payload: null,
      editable: true,
      created_at: "2026-04-20T10:00:00.000Z",
      updated_at: "2026-04-20T10:00:00.000Z",
    })),
    listSessions: vi.fn(),
    submitSupport: vi.fn(),
    requestCode: vi.fn(),
    confirmCode: vi.fn(),
    accessStatus: vi.fn(),
  } as ReturnType<typeof createAppApi>);

  const { result } = renderHook(() =>
    useSession({
      sessionId: "s1",
      mode: "write_now",
      authApi,
      onRestartSession: vi.fn(),
      onForbidden: vi.fn(),
      onToast,
      trackThinking: (promise) => promise,
    }),
  );

  await waitFor(() => {
    expect(result.current.messages).toHaveLength(1);
  });

  await act(async () => {
    await result.current.actions.deleteMessage("m1");
  });

  await waitFor(() => {
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]?.text).toBe("Первый фрагмент");
    expect(onToast).toHaveBeenCalledWith({ message: "Could not delete the fragment.", tone: "error" });
  });
});

test("useSession deletes assistant message and clears generated payload", async () => {
  mockedCreateAppApi.mockReturnValue({
    sendText: vi.fn(),
    sendMedia: vi.fn(),
    closeBatch: vi.fn(),
    deleteAsset: vi.fn(),
    deleteMessage: vi.fn(async () => ({
      session_id: "s1",
      asset_id: "ai-1",
      message_id: "ai-1",
      deleted: true,
      remaining_items: 1,
      state: "ready_to_generate",
      context_preview: "Первый фрагмент",
      ui_payload: null,
    })),
    confirmContext: vi.fn(),
    generate: vi.fn(),
    refine: vi.fn(),
    resetSession: vi.fn(),
    resetActive: vi.fn(),
    startSession: vi.fn(),
    getSessionDetail: vi.fn(async () => ({
      session_id: "s1",
      mode: "analyze_case",
      status: "active",
      state: "awaiting_refinement",
      context_preview: "Первый фрагмент",
      messages: [
        { id: "m1", kind: "text", role: "USER_SELF", text: "Первый фрагмент" },
        {
          id: "ai-1",
          kind: "assistant",
          role: null,
          text: "Ответ ассистента",
          ui_payload: { diagnosis: "Диагноз", message_template: "Ответ ассистента" },
        },
      ],
      ui_payload: { diagnosis: "Диагноз", message_template: "Ответ ассистента" },
      editable: true,
      created_at: "2026-04-20T10:00:00.000Z",
      updated_at: "2026-04-20T10:00:00.000Z",
    })),
    listSessions: vi.fn(),
    submitSupport: vi.fn(),
    requestCode: vi.fn(),
    confirmCode: vi.fn(),
    accessStatus: vi.fn(),
  } as ReturnType<typeof createAppApi>);

  const { result } = renderHook(() =>
    useSession({
      sessionId: "s1",
      mode: "analyze_case",
      authApi,
      onRestartSession: vi.fn(),
      onForbidden: vi.fn(),
      onToast: vi.fn(),
      trackThinking: (promise) => promise,
    }),
  );

  await waitFor(() => {
    expect(result.current.stage).toBe("result");
    expect(result.current.generated?.ui_payload.diagnosis).toBe("Диагноз");
  });

  await act(async () => {
    await result.current.actions.deleteMessage("ai-1");
  });

  await waitFor(() => {
    expect(result.current.stage).toBe("generate");
    expect(result.current.generated).toBeNull();
    expect(result.current.messages.map((item) => item.id)).toEqual(["m1"]);
  });
});
