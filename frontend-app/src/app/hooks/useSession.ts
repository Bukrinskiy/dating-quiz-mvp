import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, ConflictError, NotFoundError, createAppApi } from "../api";
import { useI18n } from "../i18n";
import type { AppMessages } from "../i18n";
import type {
  AppAuthApi,
  RoleMeta,
  SessionDetail,
  SessionGenerateResponse,
  SessionMessage,
  SessionMode,
  SessionStage,
} from "../types";

type UseSessionParams = {
  sessionId: string;
  mode: SessionMode;
  authApi: AppAuthApi;
  onRestartSession: (sessionId: string) => void;
  onForbidden: () => void;
  onToast: (input: {
    message: string;
    tone?: "default" | "error" | "warning" | "success";
    action?: { label: string; onClick: () => void | Promise<void> };
  }) => void;
  trackThinking: <T>(operation: Promise<T>) => Promise<T>;
};

const sessionDetailCache = new Map<string, SessionDetail>();
const sessionDetailInflight = new Map<string, Promise<SessionDetail>>();

const makeMessage = (partial: Omit<SessionMessage, "id">): SessionMessage => ({
  id: `${Date.now()}-${Math.random()}`,
  ...partial,
});

const makeAssistantMessage = (payload: SessionGenerateResponse["ui_payload"], messages: AppMessages): SessionMessage =>
  makeMessage({
    kind: "assistant",
    role: null,
    authorLabel: messages.brand.name,
    sentAt: new Date().toISOString(),
    text: String(payload.message_template || payload.diagnosis || payload.primary_message || payload.next_step || "").trim(),
    uiPayload: payload,
    pending: false,
  });

const asIsoString = (value: string): string | undefined => {
  if (!value.trim()) {
    return undefined;
  }
  return new Date(value).toISOString();
};

const stripServiceTags = (value: string): string =>
  value
    .replace(/^(?:\[(?:text|edit|audio|media|forward|role:[^\]]+|name:[^\]]+)\]\s*)+/i, "")
    .replace(/^[:\s-]+/, "")
    .trim();

const sanitizeMessageText = (kind: SessionMessage["kind"], value: string, messages: AppMessages): string => {
  const clean = stripServiceTags(value);
  if (!clean) {
    return value;
  }
  if (kind === "audio" && !clean.startsWith(messages.session.voicePendingTag)) {
    return `${messages.session.voicePendingTag}: ${clean}`;
  }
  if (kind === "image" && !clean.startsWith(messages.session.imagePendingTag)) {
    return `${messages.session.imagePendingTag}: ${clean}`;
  }
  return clean;
};

const deriveStage = (detail: SessionDetail): SessionStage => {
  if (detail.state === "awaiting_context_confirmation") {
    return "confirm";
  }
  if (detail.state === "ready_to_generate") {
    return "generate";
  }
  if (detail.state === "awaiting_refinement" && detail.ui_payload) {
    return "result";
  }
  if (detail.state === "closed" && detail.ui_payload) {
    return "result";
  }
  return "collect";
};

const toGeneratedResponse = (detail: SessionDetail): SessionGenerateResponse | null => {
  if (!detail.ui_payload) {
    return null;
  }
  return {
    session_id: detail.session_id,
    mode: detail.mode,
    state: detail.state,
    next_step: detail.state === "closed" ? "closed" : "refine_or_finish",
    llm_provider: "openai",
    model_name: "",
    ui_payload: detail.ui_payload,
  };
};

const normalizeMessages = (items: SessionDetail["messages"], messages: AppMessages): SessionMessage[] =>
  items.map((item) => ({
    id: item.id,
    kind: item.kind,
    role: item.role,
    authorLabel: (item as SessionMessage & { author_label?: string | null }).authorLabel ?? (item as { author_label?: string | null }).author_label ?? null,
    sentAt: (item as SessionMessage & { sent_at?: string | null }).sentAt ?? (item as { sent_at?: string | null }).sent_at ?? null,
    text: sanitizeMessageText(item.kind, item.text, messages),
    uiPayload: (item as SessionMessage & { ui_payload?: SessionGenerateResponse["ui_payload"] | null }).uiPayload ?? (item as { ui_payload?: SessionGenerateResponse["ui_payload"] | null }).ui_payload ?? null,
    pending: item.pending,
  }));

const readSessionDetail = (sessionId: string, loader: () => Promise<SessionDetail>): Promise<SessionDetail> => {
  const cached = sessionDetailCache.get(sessionId);
  if (cached) {
    return Promise.resolve(cached);
  }
  const inflight = sessionDetailInflight.get(sessionId);
  if (inflight) {
    return inflight;
  }
  const next = loader()
    .then((detail) => {
      sessionDetailCache.set(sessionId, detail);
      return detail;
    })
    .finally(() => {
      sessionDetailInflight.delete(sessionId);
    });
  sessionDetailInflight.set(sessionId, next);
  return next;
};

const invalidateSessionDetail = (sessionId: string) => {
  sessionDetailCache.delete(sessionId);
  sessionDetailInflight.delete(sessionId);
};

export const __resetSessionDetailCacheForTests = () => {
  sessionDetailCache.clear();
  sessionDetailInflight.clear();
};

export function useSession({
  sessionId,
  mode,
  authApi,
  onRestartSession,
  onForbidden,
  onToast,
  trackThinking,
}: UseSessionParams) {
  const { messages: i18nMessages, roleLabels } = useI18n();
  const accessToken = authApi.auth?.tokens.access_token ?? null;
  const onForbiddenRef = useRef(onForbidden);
  const onToastRef = useRef(onToast);

  useEffect(() => {
    onForbiddenRef.current = onForbidden;
  }, [onForbidden]);

  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  const api = useMemo(
    () =>
      createAppApi({
        getAccessToken: () => accessToken,
        refreshAuth: authApi.refreshAuth,
      }),
    [accessToken, authApi.refreshAuth],
  );

  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [contextPreview, setContextPreview] = useState("");
  const [generated, setGenerated] = useState<SessionGenerateResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [stage, setStage] = useState<SessionStage>("collect");
  const [loading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    setContextPreview("");
    setGenerated(null);
    setStage("collect");
    setDeletingMessageId(null);
    setReadOnly(false);
    setFinalizing(false);

    void (async () => {
      try {
        const detail = await readSessionDetail(sessionId, () => api.getSessionDetail(sessionId));
        if (cancelled) {
          return;
        }
        const nextMessages = normalizeMessages(detail.messages, i18nMessages);
        if (detail.ui_payload && !nextMessages.some((message) => message.kind === "assistant" && message.uiPayload)) {
          nextMessages.push(makeAssistantMessage(detail.ui_payload, i18nMessages));
        }
        setMessages(nextMessages);
        setContextPreview(detail.context_preview || "");
        setGenerated(toGeneratedResponse(detail));
        setStage(deriveStage(detail));
        setReadOnly(!detail.editable);
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ConflictError && error.status === 403) {
          onToastRef.current({ message: i18nMessages.toasts.sessionOwnershipMismatch, tone: "warning" });
          onForbiddenRef.current();
        } else if (error instanceof NotFoundError) {
          onToastRef.current({ message: i18nMessages.toasts.sessionRestart, tone: "warning" });
        } else {
          onToastRef.current({ message: i18nMessages.session.loadError, tone: "error" });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, i18nMessages, sessionId]);

  const guardReadOnly = useCallback(() => {
    if (!readOnly) {
      return false;
    }
    onToast({ message: i18nMessages.session.readOnly, tone: "warning" });
    return true;
  }, [i18nMessages, onToast, readOnly]);

  const withRecovery = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T> => {
      try {
        return await operation();
      } catch (error) {
        if (error instanceof ConflictError && error.status === 403) {
          onToast({
            message: i18nMessages.toasts.sessionOwnershipMismatch,
            tone: "warning",
          });
          onForbidden();
          throw error;
        }
        if (error instanceof NotFoundError || error instanceof ConflictError) {
          const reset = await api.resetActive();
          const next = await api.startSession(mode);
          onToast({
            message: error instanceof NotFoundError ? i18nMessages.toasts.sessionRestart : i18nMessages.toasts.sessionConflict,
            action: {
              label: i18nMessages.toasts.startOver,
              onClick: () => onRestartSession(next.session_id),
            },
          });
          if (reset.closed_sessions >= 0) {
            onRestartSession(next.session_id);
          }
          throw error;
        }
        throw error;
      }
    },
    [api, i18nMessages, mode, onForbidden, onRestartSession, onToast],
  );

  const sendText = useCallback(
    async (input: { text: string; meta: RoleMeta }) => {
      if (guardReadOnly()) {
        return;
      }
      const cleanText = input.text.trim();
      if (!cleanText) {
        return;
      }
      setBusy(true);
      invalidateSessionDetail(sessionId);
      const optimistic = makeMessage({
        kind: "text",
        role: input.meta.role,
        authorLabel: input.meta.display_name || roleLabels[input.meta.role],
        sentAt: input.meta.sent_at,
        text: cleanText,
        pending: true,
      });
      setMessages((current) => [...current, optimistic]);
      try {
        await withRecovery(() =>
          api.sendText(sessionId, {
            text: cleanText,
            role: input.meta.role,
            display_name: input.meta.display_name || undefined,
            sent_at: asIsoString(input.meta.sent_at),
          }),
        );
        setGenerated(null);
        setContextPreview("");
        setStage("collect");
        setMessages((current) => current.map((message) => (message.id === optimistic.id ? { ...message, pending: false } : message)));
      } finally {
        setBusy(false);
      }
    },
    [api, guardReadOnly, roleLabels, sessionId, withRecovery],
  );

  const uploadMedia = useCallback(
    async (kind: "image" | "audio", file: File, meta: RoleMeta) => {
      if (guardReadOnly()) {
        return;
      }
      const optimistic = makeMessage({
        kind,
        role: meta.role,
        authorLabel: meta.display_name || roleLabels[meta.role],
        sentAt: meta.sent_at,
        text: kind === "audio" ? i18nMessages.session.voicePendingTag : i18nMessages.session.imagePendingTag,
        pending: true,
      });
      setBusy(true);
      invalidateSessionDetail(sessionId);
      setMessages((current) => [...current, optimistic]);
      try {
        const response = await withRecovery(() =>
          trackThinking(
            api.sendMedia(sessionId, kind, file, {
              role: meta.role,
              display_name: meta.display_name || undefined,
              sent_at: asIsoString(meta.sent_at),
            }),
          ),
        );
        setGenerated(null);
        setContextPreview("");
        setStage("collect");
        setMessages((current) => {
          const transcript = stripServiceTags(response.summary_for_user || "");
          const nextText =
            kind === "audio"
              ? transcript
                ? `${i18nMessages.session.voicePendingTag}: ${transcript}`
                : i18nMessages.session.voicePendingTag
              : transcript
                ? `${i18nMessages.session.imagePendingTag}: ${transcript}`
                : i18nMessages.session.imagePendingTag;
          return current.map((message) =>
            message.id === optimistic.id ? { ...message, pending: false, text: nextText ?? message.text } : message,
          );
        });
      } catch (error) {
        setMessages((current) => current.filter((message) => message.id !== optimistic.id));
        if (kind === "audio") {
          onToast({
            message:
              error instanceof ApiError && error.detail
                ? i18nMessages.session.voiceDecodeError
                : i18nMessages.session.voiceDecodeError,
            tone: "error",
          });
          return;
        }
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [api, guardReadOnly, i18nMessages, onToast, roleLabels, sessionId, trackThinking, withRecovery],
  );

  const closeBatch = useCallback(async () => {
    if (guardReadOnly()) {
      return;
    }
    setBusy(true);
    invalidateSessionDetail(sessionId);
    try {
      const batch = await withRecovery(() => api.closeBatch(sessionId));
      setContextPreview(batch.context_preview);
      setStage("confirm");
    } finally {
      setBusy(false);
    }
  }, [api, guardReadOnly, sessionId, withRecovery]);

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (guardReadOnly()) {
        return false;
      }
      if (!messageId || deletingMessageId) {
        return false;
      }

      const snapshotMessages = messages;
      const snapshotPreview = contextPreview;
      const snapshotStage = stage;
      const snapshotGenerated = generated;
      const target = messages.find((message) => message.id === messageId);
      if (!target || target.pending || target.kind === "system") {
        return false;
      }

      setDeletingMessageId(messageId);
      invalidateSessionDetail(sessionId);
      setMessages((current) => current.filter((message) => message.id !== messageId));
      if (stage === "confirm") {
        setStage("collect");
      }

      try {
        const response = await withRecovery(() => api.deleteMessage(sessionId, messageId));
        setContextPreview(response.context_preview || "");
        if (response.ui_payload) {
          setGenerated({
            session_id: sessionId,
            mode,
            state: response.state,
            next_step: "refine_or_finish",
            llm_provider: "openai",
            model_name: "",
            ui_payload: response.ui_payload,
          });
        } else if (target.kind === "assistant") {
          setGenerated(null);
        }
        if (response.state === "collecting_context") {
          setStage("collect");
          setGenerated(null);
        } else if (response.state === "ready_to_generate") {
          setStage("generate");
        } else if (response.state === "awaiting_refinement") {
          setStage("result");
        }
        return true;
      } catch {
        setMessages(snapshotMessages);
        setContextPreview(snapshotPreview);
        setStage(snapshotStage);
        setGenerated(snapshotGenerated);
        onToast({
          message: i18nMessages.session.deleteFragmentError,
          tone: "error",
        });
        return false;
      } finally {
        setDeletingMessageId(null);
      }
    },
    [api, contextPreview, deletingMessageId, generated, guardReadOnly, i18nMessages, messages, mode, onToast, sessionId, stage, withRecovery],
  );

  const confirmContext = useCallback(
    async (action: "confirm:yes" | "confirm:edit", editText?: string) => {
      if (guardReadOnly()) {
        return;
      }
      setBusy(true);
      invalidateSessionDetail(sessionId);
      try {
        const response = await withRecovery(() => api.confirmContext(sessionId, action, editText));
        setContextPreview(response.context_preview || "");
        setStage(response.needs_confirmation ? "confirm" : response.state === "ready_to_generate" ? "generate" : "collect");
        if (action === "confirm:edit" && editText?.trim()) {
          setMessages((current) => [...current, makeMessage({ kind: "text", text: editText.trim() })]);
        }
      } finally {
        setBusy(false);
      }
    },
    [api, guardReadOnly, sessionId, withRecovery],
  );

  const generate = useCallback(async () => {
    if (guardReadOnly()) {
      return;
    }
    setBusy(true);
    invalidateSessionDetail(sessionId);
    try {
      const response = await withRecovery(() => trackThinking(api.generate(sessionId)));
      setGenerated(response);
      setMessages((current) => [...current, makeAssistantMessage(response.ui_payload, i18nMessages)]);
      setStage("result");
    } finally {
      setBusy(false);
    }
  }, [api, guardReadOnly, i18nMessages, sessionId, trackThinking, withRecovery]);

  const finalizeBatch = useCallback(async () => {
    if (guardReadOnly()) {
      return;
    }
    setBusy(true);
    setFinalizing(true);
    invalidateSessionDetail(sessionId);
    try {
      const batch = await withRecovery(() => api.closeBatch(sessionId));
      setContextPreview(batch.context_preview || "");
      setStage("generate");

      const confirm = await withRecovery(() => api.confirmContext(sessionId, "confirm:yes"));
      setContextPreview(confirm.context_preview || batch.context_preview || "");
      setStage("generate");

      const response = await withRecovery(() => trackThinking(api.generate(sessionId)));
      setGenerated(response);
      setMessages((current) => [...current, makeAssistantMessage(response.ui_payload, i18nMessages)]);
      setStage("result");
    } catch (error) {
      setStage("collect");
      throw error;
    } finally {
      setFinalizing(false);
      setBusy(false);
    }
  }, [api, guardReadOnly, i18nMessages, sessionId, trackThinking, withRecovery]);

  const refine = useCallback(
    async (command: string) => {
      if (guardReadOnly()) {
        return;
      }
      if (!command.trim()) {
        return;
      }
      setBusy(true);
      invalidateSessionDetail(sessionId);
      try {
        const response = await withRecovery(() => trackThinking(api.refine(sessionId, command.trim())));
        setGenerated(response);
        setMessages((current) => [...current, makeAssistantMessage(response.ui_payload, i18nMessages)]);
        setStage("result");
      } finally {
        setBusy(false);
      }
    },
    [api, guardReadOnly, i18nMessages, sessionId, trackThinking, withRecovery],
  );

  const reset = useCallback(async () => {
    if (guardReadOnly()) {
      return;
    }
    setBusy(true);
    invalidateSessionDetail(sessionId);
    try {
      await withRecovery(() => api.resetSession(sessionId));
    } finally {
      setBusy(false);
    }
  }, [api, guardReadOnly, sessionId, withRecovery]);

  const returnToCollect = useCallback(() => {
    if (readOnly) {
      onToast({ message: i18nMessages.session.readOnly, tone: "warning" });
      return;
    }
    setStage("collect");
  }, [i18nMessages, onToast, readOnly]);

  return {
    messages,
    contextPreview,
    generated,
    busy,
    deletingMessageId,
    loading,
    readOnly,
    finalizing,
    stage,
    hasAssets: messages.some((item) => item.kind !== "system"),
    actions: {
      sendText,
      uploadMedia,
      closeBatch,
      finalizeBatch,
      confirmContext,
      generate,
      refine,
      reset,
      deleteMessage,
      returnToCollect,
    },
  };
}
