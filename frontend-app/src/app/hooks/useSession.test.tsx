import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { AuthError, ConflictError, NotFoundError, ServerError, createAppApi } from "../api";
import { __resetSessionDetailCacheForTests, useSession } from "./useSession";

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
  refreshAuth: vi.fn(async () => ({
    user: { id: "1", email: "a@b.c", locale: "ru" },
    tokens: { access_token: "token-2", expires_in: 3600 },
    access: { has_access: true, access_status: "active" },
  })),
  logout: vi.fn(),
};

const detailFixture = {
  session_id: "s1",
  mode: "write_now",
  status: "active",
  state: "collecting_context",
  context_preview: "",
  messages: [],
  ui_payload: null,
  editable: true,
  created_at: "2026-04-20T10:00:00.000Z",
  updated_at: "2026-04-20T10:00:00.000Z",
} as const;

beforeEach(() => {
  vi.clearAllMocks();
  __resetSessionDetailCacheForTests();
});

test("useSession happy path", async () => {
  const closeBatch = vi.fn(async () => ({
    session_id: "s1",
    state: "awaiting_context_confirmation",
    needs_confirmation: true,
    context_preview: "preview",
  }));
  const confirmContext = vi.fn(async () => ({
    session_id: "s1",
    state: "ready_to_generate",
    needs_confirmation: false,
    context_preview: "",
  }));
  const generate = vi.fn(async () => ({
    session_id: "s1",
    mode: "write_now",
    state: "awaiting_refinement",
    next_step: "refine_or_finish",
    llm_provider: "openai",
    model_name: "gpt",
    ui_payload: { primary_message: "hi" },
  }));
  mockedCreateAppApi.mockReturnValue({
    sendText: vi.fn(async () => ({
      session_id: "s1",
      asset_id: "a1",
      state: "collecting_context",
      needs_confirmation: false,
      summary_for_user: "saved",
    })),
    sendMedia: vi.fn(),
    closeBatch,
    confirmContext,
    generate,
    refine: vi.fn(),
    resetSession: vi.fn(),
    resetActive: vi.fn(async () => ({ status: "closed", closed_sessions: 0 })),
    startSession: vi.fn(async () => ({ session_id: "s2" })),
    getSessionDetail: vi.fn(async () => detailFixture),
    listSessions: vi.fn(),
    submitSupport: vi.fn(),
    requestCode: vi.fn(),
    confirmCode: vi.fn(),
    accessStatus: vi.fn(),
  } as ReturnType<typeof createAppApi>);

  const onRestartSession = vi.fn();
  const onToast = vi.fn();
  const { result } = renderHook(() =>
    useSession({
      sessionId: "s1",
      mode: "write_now",
      authApi,
      onRestartSession,
      onForbidden: vi.fn(),
      onToast,
      trackThinking: (promise) => promise,
    }),
  );

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  await act(async () => {
    await result.current.actions.sendText({
      text: "hello",
      meta: { role: "USER_SELF", display_name: "", sent_at: "" },
    });
    await result.current.actions.finalizeBatch();
  });

  await waitFor(() => {
    expect(result.current.messages.some((item) => item.text === "hello")).toBe(true);
    expect(result.current.messages.some((item) => item.kind === "system")).toBe(false);
    expect(result.current.generated?.ui_payload.primary_message).toBe("hi");
    expect(result.current.stage).toBe("result");
  });
  expect(closeBatch).toHaveBeenCalledTimes(1);
  expect(confirmContext).toHaveBeenCalledWith("s1", "confirm:yes");
  expect(generate).toHaveBeenCalledTimes(1);
  expect(result.current.contextPreview).toBe("preview");
  expect(onToast).not.toHaveBeenCalled();
});

test("useSession keeps previous AI answer visible before follow-up message", async () => {
  const sendText = vi.fn(async () => ({
    session_id: "s1",
    asset_id: "a1",
    state: "collecting_context",
    needs_confirmation: false,
    summary_for_user: "saved",
  }));

  mockedCreateAppApi.mockReturnValue({
    sendText,
    sendMedia: vi.fn(),
    closeBatch: vi.fn(),
    confirmContext: vi.fn(),
    generate: vi.fn(),
    refine: vi.fn(),
    resetSession: vi.fn(),
    resetActive: vi.fn(),
    startSession: vi.fn(),
    getSessionDetail: vi.fn(async () => ({
      ...detailFixture,
      state: "awaiting_refinement",
      ui_payload: {
        diagnosis: "Диалог завис",
        message_template: "Привет. Давай без напряга продолжим позже :)",
      },
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
    expect(result.current.loading).toBe(false);
    expect(result.current.stage).toBe("result");
  });

  await act(async () => {
    await result.current.actions.sendText({
      text: "Она ответила через час",
      meta: { role: "USER_SELF", display_name: "", sent_at: "" },
    });
  });

  expect(sendText).toHaveBeenCalledTimes(1);
  expect(sendText).toHaveBeenCalledWith("s1", {
    text: "Она ответила через час",
    role: "USER_SELF",
    display_name: undefined,
    sent_at: undefined,
  });
  expect(result.current.messages.map((item) => item.kind)).toEqual(["assistant", "text"]);
  expect(result.current.messages[0]?.text).toBe("Привет. Давай без напряга продолжим позже :)");
  expect(result.current.messages[1]?.text).toBe("Она ответила через час");
});

test("useSession restarts on 404", async () => {
  const resetActive = vi.fn(async () => ({ status: "closed", closed_sessions: 1 }));
  const startSession = vi.fn(async () => ({ session_id: "fresh-session" }));
  mockedCreateAppApi.mockReturnValue({
    sendText: vi.fn(async () => {
      throw new NotFoundError("Session not found");
    }),
    sendMedia: vi.fn(),
    closeBatch: vi.fn(),
    confirmContext: vi.fn(),
    generate: vi.fn(),
    refine: vi.fn(),
    resetSession: vi.fn(),
    resetActive,
    startSession,
    getSessionDetail: vi.fn(async () => detailFixture),
    listSessions: vi.fn(),
    submitSupport: vi.fn(),
    requestCode: vi.fn(),
    confirmCode: vi.fn(),
    accessStatus: vi.fn(),
  } as ReturnType<typeof createAppApi>);

  const onRestartSession = vi.fn();
  const onToast = vi.fn();
  const { result } = renderHook(() =>
    useSession({
      sessionId: "old-session",
      mode: "write_now",
      authApi,
      onRestartSession,
      onForbidden: vi.fn(),
      onToast,
      trackThinking: (promise) => promise,
    }),
  );

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  await expect(
    act(async () => {
      await result.current.actions.sendText({
        text: "hello",
        meta: { role: "USER_SELF", display_name: "", sent_at: "" },
      });
    }),
  ).rejects.toBeInstanceOf(NotFoundError);

  await waitFor(() => {
    expect(resetActive).toHaveBeenCalled();
    expect(startSession).toHaveBeenCalledWith("write_now");
    expect(onRestartSession).toHaveBeenCalledWith("fresh-session");
    expect(onToast).toHaveBeenCalled();
  });
});

test("useSession does not restart on session ownership mismatch", async () => {
  const resetActive = vi.fn(async () => ({ status: "closed", closed_sessions: 1 }));
  const startSession = vi.fn(async () => ({ session_id: "fresh-session" }));
  const onForbidden = vi.fn();
  const onToast = vi.fn();

  mockedCreateAppApi.mockReturnValue({
    sendText: vi.fn(async () => {
      throw new ConflictError(403, "Session ownership mismatch");
    }),
    sendMedia: vi.fn(),
    closeBatch: vi.fn(),
    confirmContext: vi.fn(),
    generate: vi.fn(),
    refine: vi.fn(),
    resetSession: vi.fn(),
    resetActive,
    startSession,
    getSessionDetail: vi.fn(async () => detailFixture),
    listSessions: vi.fn(),
    submitSupport: vi.fn(),
    requestCode: vi.fn(),
    confirmCode: vi.fn(),
    accessStatus: vi.fn(),
  } as ReturnType<typeof createAppApi>);

  const { result } = renderHook(() =>
    useSession({
      sessionId: "foreign-session",
      mode: "write_now",
      authApi,
      onRestartSession: vi.fn(),
      onForbidden,
      onToast,
      trackThinking: (promise) => promise,
    }),
  );

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  await expect(
    act(async () => {
      await result.current.actions.sendText({
        text: "hello",
        meta: { role: "USER_SELF", display_name: "", sent_at: "" },
      });
    }),
  ).rejects.toBeInstanceOf(ConflictError);

  await waitFor(() => {
    expect(onForbidden).toHaveBeenCalled();
    expect(onToast).toHaveBeenCalledWith({
      message: "This session belongs to another login or is outdated.",
      tone: "warning",
    });
  });
  expect(resetActive).not.toHaveBeenCalled();
  expect(startSession).not.toHaveBeenCalled();
});

test("useSession delegates 401 refresh to api client", async () => {
  const sendText = vi.fn(async () => {
    throw new AuthError();
  });
  mockedCreateAppApi.mockReturnValue({
    sendText,
    sendMedia: vi.fn(),
    closeBatch: vi.fn(),
    confirmContext: vi.fn(),
    generate: vi.fn(),
    refine: vi.fn(),
    resetSession: vi.fn(),
    resetActive: vi.fn(),
    startSession: vi.fn(),
    getSessionDetail: vi.fn(async () => detailFixture),
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
    expect(result.current.loading).toBe(false);
  });

  await expect(
    act(async () => {
      await result.current.actions.sendText({
        text: "hello",
        meta: { role: "USER_SELF", display_name: "", sent_at: "" },
      });
    }),
  ).rejects.toBeInstanceOf(AuthError);
});

test("useSession shows pending voice tag instead of file name while audio uploads", async () => {
  let resolveMedia: ((value: {
    session_id: string;
    asset_id: string;
    state: string;
    needs_confirmation: boolean;
    summary_for_user: string;
  }) => void) | null = null;

  mockedCreateAppApi.mockReturnValue({
    sendText: vi.fn(),
    sendMedia: vi.fn(
      () =>
        new Promise((resolve) => {
          resolveMedia = resolve;
        }),
    ),
    closeBatch: vi.fn(),
    confirmContext: vi.fn(),
    generate: vi.fn(),
    refine: vi.fn(),
    resetSession: vi.fn(),
    resetActive: vi.fn(),
    startSession: vi.fn(),
    getSessionDetail: vi.fn(async () => detailFixture),
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
    expect(result.current.loading).toBe(false);
  });

  await act(async () => {
    void result.current.actions.uploadMedia(
      "audio",
      new File(["audio"], "voice-note.webm", { type: "audio/webm" }),
      { role: "USER_SELF", display_name: "", sent_at: "" },
    );
  });

  await waitFor(() => {
    expect(result.current.messages.some((item) => item.text === "[VOICE]" && item.pending)).toBe(true);
    expect(result.current.messages.some((item) => item.text === "voice-note.webm")).toBe(false);
  });

  await act(async () => {
    resolveMedia?.({
      session_id: "s1",
      asset_id: "a1",
      state: "collecting_context",
      needs_confirmation: false,
      summary_for_user: "[audio][forward][role:USER_SELF][name:Тема] Привет как дела",
    });
  });

  await waitFor(() => {
    expect(result.current.messages.some((item) => item.text === "[VOICE]: Привет как дела" && !item.pending)).toBe(true);
    expect(result.current.messages.some((item) => item.kind === "system")).toBe(false);
  });
});

test("useSession shows inline image transcript without system message", async () => {
  let resolveMedia: ((value: {
    session_id: string;
    asset_id: string;
    state: string;
    needs_confirmation: boolean;
    summary_for_user: string;
  }) => void) | null = null;

  mockedCreateAppApi.mockReturnValue({
    sendText: vi.fn(),
    sendMedia: vi.fn(
      () =>
        new Promise((resolve) => {
          resolveMedia = resolve;
        }),
    ),
    closeBatch: vi.fn(),
    confirmContext: vi.fn(),
    generate: vi.fn(),
    refine: vi.fn(),
    resetSession: vi.fn(),
    resetActive: vi.fn(),
    startSession: vi.fn(),
    getSessionDetail: vi.fn(async () => detailFixture),
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
    expect(result.current.loading).toBe(false);
  });

  await act(async () => {
    void result.current.actions.uploadMedia(
      "image",
      new File(["image"], "photo.jpg", { type: "image/jpeg" }),
      { role: "USER_SELF", display_name: "", sent_at: "" },
    );
  });

  await waitFor(() => {
    expect(result.current.messages.some((item) => item.text === "[IMAGE]" && item.pending)).toBe(true);
  });

  await act(async () => {
    resolveMedia?.({
      session_id: "s1",
      asset_id: "a1",
      state: "collecting_context",
      needs_confirmation: false,
      summary_for_user: "[media][forward][role:USER_SELF] Привет с картинки",
    });
  });

  await waitFor(() => {
    expect(result.current.messages.some((item) => item.text.includes("Привет с картинки") && !item.pending)).toBe(true);
    expect(result.current.messages.some((item) => item.kind === "system")).toBe(false);
  });
});

test("useSession removes pending voice bubble and shows toast when audio decoding fails", async () => {
  const onToast = vi.fn();

  mockedCreateAppApi.mockReturnValue({
    sendText: vi.fn(),
    sendMedia: vi.fn(async () => {
      throw new ServerError(502, "OpenAI STT request failed");
    }),
    closeBatch: vi.fn(),
    confirmContext: vi.fn(),
    generate: vi.fn(),
    refine: vi.fn(),
    resetSession: vi.fn(),
    resetActive: vi.fn(),
    startSession: vi.fn(),
    getSessionDetail: vi.fn(async () => detailFixture),
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

  await act(async () => {
    await result.current.actions.uploadMedia(
      "audio",
      new File(["audio"], "voice-note.webm", { type: "audio/webm" }),
      { role: "USER_SELF", display_name: "", sent_at: "" },
    );
  });

  await waitFor(() => {
    expect(result.current.messages.some((item) => item.text === "[VOICE]")).toBe(false);
    expect(onToast).toHaveBeenCalledWith({ message: "Could not transcribe the voice note.", tone: "error" });
  });
});

test("useSession hydrates session detail and exposes read-only closed sessions", async () => {
  mockedCreateAppApi.mockReturnValue({
    sendText: vi.fn(),
    sendMedia: vi.fn(),
    closeBatch: vi.fn(),
    confirmContext: vi.fn(),
    generate: vi.fn(),
    refine: vi.fn(),
    resetSession: vi.fn(),
    resetActive: vi.fn(),
    startSession: vi.fn(),
    getSessionDetail: vi.fn(async () => ({
      ...detailFixture,
      status: "closed",
      state: "awaiting_refinement",
      context_preview: "preview",
      editable: false,
      messages: [
        { id: "m1", kind: "audio", role: "USER_SELF", authorLabel: "Я писал(а)", sentAt: null, text: "[ГОЛОСОВОЕ]: Привет" },
        { id: "m2", kind: "text", role: "USER_SELF", authorLabel: "Я писал(а)", sentAt: null, text: "[text] Привет текстом" },
      ],
      ui_payload: { primary_message: "Готовый ответ" },
    })),
    listSessions: vi.fn(),
    submitSupport: vi.fn(),
    requestCode: vi.fn(),
    confirmCode: vi.fn(),
    accessStatus: vi.fn(),
  } as ReturnType<typeof createAppApi>);

  const onToast = vi.fn();
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
    expect(result.current.loading).toBe(false);
    expect(result.current.readOnly).toBe(true);
    expect(result.current.stage).toBe("result");
    expect(result.current.messages[0]?.text).toBe("[VOICE]: [ГОЛОСОВОЕ]: Привет");
    expect(result.current.messages[1]?.text).toBe("Привет текстом");
    expect(result.current.generated?.ui_payload.primary_message).toBe("Готовый ответ");
  });
});

test("useSession does not refetch detail when toast handler identity changes", async () => {
  const getSessionDetail = vi.fn(async () => detailFixture);

  mockedCreateAppApi.mockReturnValue({
    sendText: vi.fn(),
    sendMedia: vi.fn(),
    closeBatch: vi.fn(),
    confirmContext: vi.fn(),
    generate: vi.fn(),
    refine: vi.fn(),
    resetSession: vi.fn(),
    resetActive: vi.fn(),
    startSession: vi.fn(),
    getSessionDetail,
    listSessions: vi.fn(),
    submitSupport: vi.fn(),
    requestCode: vi.fn(),
    confirmCode: vi.fn(),
    accessStatus: vi.fn(),
  } as ReturnType<typeof createAppApi>);

  const { rerender } = renderHook(
    ({ onToast }) =>
      useSession({
        sessionId: "s1",
        mode: "write_now",
        authApi,
        onRestartSession: vi.fn(),
        onForbidden: vi.fn(),
        onToast,
        trackThinking: (promise) => promise,
      }),
    { initialProps: { onToast: vi.fn() } },
  );

  await waitFor(() => {
    expect(getSessionDetail).toHaveBeenCalledTimes(1);
  });

  rerender({ onToast: vi.fn() });

  await waitFor(() => {
    expect(getSessionDetail).toHaveBeenCalledTimes(1);
  });
});
