import { useMemo, useRef, useState } from "react";

import { asTextList } from "../api";
import { useI18n, type AppMessages } from "../i18n";
import { BottomSheet } from "../ui/BottomSheet";
import type { RoleMeta, SessionGeneratePayload, SessionMessage } from "../types";
import { BatchCloseBar } from "./BatchCloseBar";
import { Composer } from "./Composer";
import { MessageBubble, SWIPE_OPEN_THRESHOLD_PX, SWIPE_REVEAL_PX } from "./MessageBubble";
import { PrototypeIcon } from "../ui/icons";

type ChatScreenProps = {
  busy: boolean;
  deletingMessageId: string | null;
  generated: SessionGeneratePayload | null;
  generating: boolean;
  messages: SessionMessage[];
  meta: RoleMeta;
  hasAssets: boolean;
  onSendAudio: (file: File) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<boolean>;
  onSendImage: (file: File) => Promise<void>;
  onAudioDenied: () => void;
  onOpenRoleMeta: () => void;
  onSendText: (text: string, meta: RoleMeta) => Promise<void>;
  onCloseBatch: () => Promise<void>;
};

export function ChatScreen({
  busy,
  deletingMessageId,
  generated,
  generating,
  messages,
  meta,
  hasAssets,
  onSendAudio,
  onDeleteMessage,
  onSendImage,
  onAudioDenied,
  onOpenRoleMeta,
  onSendText,
  onCloseBatch,
}: ChatScreenProps) {
  const { messages: i18nMessages } = useI18n();
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [detailPayload, setDetailPayload] = useState<SessionGeneratePayload | null>(null);
  const visibleMessages = messages.filter((message) => message.kind !== "system");
  const contentCount = visibleMessages.filter((message) => message.kind !== "assistant").length;
  const hasMessages = visibleMessages.length > 0;
  void generated;
  const resultSections = useMemo(() => buildResultSections(detailPayload, i18nMessages), [detailPayload, i18nMessages]);
  const activeSection = resultSections.find((section) => section.key === detailKey) ?? null;

  return (
    <section className={`chat-screen${hasMessages ? " chat-screen--filled" : " chat-screen--empty"}`}>
      <div
        className="chat-scroll"
        onClick={() => {
          setActiveSwipeId(null);
        }}
      >
        {hasMessages ? (
          visibleMessages.map((message) =>
            message.kind === "assistant" && message.uiPayload ? (
              <ResultBubble
                canDelete={!busy && !message.pending}
                deleting={deletingMessageId === message.id}
                id={message.id}
                key={message.id}
                previewText={message.text || getPrimaryResultText(message.uiPayload)}
                sections={buildResultSections(message.uiPayload, i18nMessages)}
                swipeOpen={activeSwipeId === message.id}
                onDeleteRequest={async () => {
                  const deleted = await onDeleteMessage(message.id);
                  if (deleted) {
                    setActiveSwipeId((current) => (current === message.id ? null : current));
                  }
                }}
                onSwipeClose={() => {
                  setActiveSwipeId((current) => (current === message.id ? null : current));
                }}
                onSwipeOpen={() => {
                  setActiveSwipeId(message.id);
                }}
                onOpenDetail={(key) => {
                  setDetailPayload(message.uiPayload || null);
                  setDetailKey(key);
                }}
              />
            ) : (
              <MessageBubble
                canDelete={!busy && !message.pending}
                deleting={deletingMessageId === message.id}
                key={message.id}
                message={message}
                onDeleteRequest={async (selected) => {
                  const deleted = await onDeleteMessage(selected.id);
                  if (deleted) {
                    setActiveSwipeId((current) => (current === selected.id ? null : current));
                  }
                }}
                onSwipeClose={() => {
                  setActiveSwipeId((current) => (current === message.id ? null : current));
                }}
                onSwipeOpen={() => {
                  setActiveSwipeId(message.id);
                }}
                swipeOpen={activeSwipeId === message.id}
              />
            ),
          )
        ) : (
          <div className="empty-chat">
            <div className="empty-chat__icon-wrap">
              <div className="empty-chat__icon">
                <PrototypeIcon.emptyChat />
              </div>
            </div>
            <strong>{i18nMessages.session.emptyChatTitle}</strong>
            <p>{i18nMessages.session.emptyChatBody}</p>
          </div>
        )}
        {generating ? (
          <div className="bubble-row bubble-row--assistant">
            <article className="bubble bubble--assistant bubble--assistant-loading">
              <header className="bubble__meta">
                <strong>{i18nMessages.brand.name}</strong>
              </header>
              <div className="result-inline__loading">
                <span aria-hidden="true" className="bubble__spinner" />
                <div>
                  <strong>{i18nMessages.session.loadingTitle}</strong>
                  <p>{i18nMessages.session.loadingBody}</p>
                </div>
              </div>
            </article>
          </div>
        ) : null}
      </div>
      <div className="chat-screen__footer">
        {hasAssets ? <BatchCloseBar busy={busy} count={contentCount} onDone={() => void onCloseBatch()} /> : null}
        <Composer
          busy={busy}
          meta={meta}
          onAudioDenied={onAudioDenied}
          onOpenRoleMeta={onOpenRoleMeta}
          onSend={onSendText}
          onSendAudio={onSendAudio}
          onSendImage={onSendImage}
        />
      </div>
      <BottomSheet
        open={Boolean(activeSection)}
        title={activeSection?.label || i18nMessages.session.resultDetails}
        onClose={() => {
          setDetailKey(null);
          setDetailPayload(null);
        }}
      >
        {activeSection ? (
          Array.isArray(activeSection.value) ? (
            activeSection.value.length ? (
              <ul className="result-detail-list">
                {activeSection.value.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="sheet-copy">{i18nMessages.session.cards.emptyList}</p>
            )
          ) : (
            <p className="sheet-copy">{activeSection.value || i18nMessages.session.cards.emptyList}</p>
          )
        ) : null}
      </BottomSheet>
    </section>
  );
}

type ResultSection = {
  key: string;
  label: string;
  value: string | string[];
};

function ResultBubble({
  canDelete,
  deleting,
  id,
  previewText,
  sections,
  swipeOpen,
  onDeleteRequest,
  onOpenDetail,
  onSwipeClose,
  onSwipeOpen,
}: {
  canDelete: boolean;
  deleting: boolean;
  id: string;
  previewText: string;
  sections: ResultSection[];
  swipeOpen: boolean;
  onDeleteRequest: () => void | Promise<void>;
  onOpenDetail: (key: string) => void;
  onSwipeClose: () => void;
  onSwipeOpen: () => void;
}) {
  const { messages } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const dragOffsetRef = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const offset = dragOffset ?? (swipeOpen ? SWIPE_REVEAL_PX : 0);

  const resetGesture = () => {
    startXRef.current = null;
    startYRef.current = null;
    draggingRef.current = false;
    dragOffsetRef.current = null;
    setDragOffset(null);
  };

  return (
    <div
      className={`bubble-row bubble-row--assistant${swipeOpen ? " is-open" : ""}${deleting ? " is-deleting" : ""}`}
    >
      <header className="bubble__meta bubble__meta--result">
        <strong>{messages.session.resultTitle}</strong>
      </header>
      <div className="bubble-swipe bubble-swipe--assistant">
        {canDelete && (swipeOpen || dragOffset !== null) ? (
          <div className="bubble-swipe__actions">
            <button
              className="bubble-swipe__action bubble-swipe__action--danger"
              disabled={deleting}
              onClick={(event) => {
                event.stopPropagation();
                void onDeleteRequest();
              }}
              aria-label={messages.session.deleteFragment}
              type="button"
            >
              <PrototypeIcon.trash />
            </button>
          </div>
        ) : null}
        <article
          className={`bubble bubble--assistant bubble--result${deleting ? " bubble--deleting" : ""}`}
          onPointerCancel={resetGesture}
          onPointerDown={(event) => {
            if (!canDelete || deleting) {
              return;
            }
            startXRef.current = event.clientX;
            startYRef.current = event.clientY;
            draggingRef.current = false;
            setDragOffset(null);
          }}
          onPointerMove={(event) => {
            if (startXRef.current === null || startYRef.current === null || !canDelete || deleting) {
              return;
            }
            const dx = event.clientX - startXRef.current;
            const dy = event.clientY - startYRef.current;
            if (Math.abs(dx) <= Math.abs(dy) || dx < 0) {
              return;
            }
            draggingRef.current = true;
            suppressClickRef.current = true;
            const baseOffset = swipeOpen ? SWIPE_REVEAL_PX : 0;
            const nextOffset = Math.max(0, Math.min(SWIPE_REVEAL_PX, baseOffset + dx));
            dragOffsetRef.current = nextOffset;
            setDragOffset(nextOffset);
          }}
          onPointerUp={() => {
            if (draggingRef.current && canDelete) {
              const finalOffset = dragOffsetRef.current ?? offset;
              if (finalOffset >= SWIPE_OPEN_THRESHOLD_PX) {
                onSwipeOpen();
              } else {
                onSwipeClose();
              }
            }
            resetGesture();
          }}
          onClick={(event) => {
            if (suppressClickRef.current) {
              event.stopPropagation();
              suppressClickRef.current = false;
            }
          }}
          style={{ transform: `translateX(${offset}px)` }}
          data-message-id={id}
        >
          <div className="result-inline">
            <p className={`result-inline__text${expanded ? " is-expanded" : ""}`}>{previewText || "—"}</p>
            {previewText ? (
              <button className="result-inline__toggle" onClick={() => setExpanded((value) => !value)} type="button">
                {expanded ? messages.session.showLess : messages.session.showMore}
              </button>
            ) : null}
            {sections.length ? (
              <div className="result-inline__chips">
                {sections.map((section) => (
                  <button className="chip" key={section.key} onClick={() => onOpenDetail(section.key)} type="button">
                    {section.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  );
}

function getPrimaryResultText(payload: SessionGeneratePayload | null): string {
  if (!payload) {
    return "";
  }
  return String(payload.message_template || payload.diagnosis || payload.primary_message || "").trim();
}

function buildResultSections(payload: SessionGeneratePayload | null, messages: AppMessages): ResultSection[] {
  if (!payload) {
    return [];
  }

  return [
    { key: "diagnosis", label: messages.session.cards.diagnosis, value: String(payload.diagnosis || "").trim() },
    { key: "core_leverage", label: messages.session.cards.leverage, value: String(payload.core_leverage || "").trim() },
    { key: "plan_24h", label: messages.session.cards.plan24, value: asTextList(payload.plan_24h) },
    { key: "plan_if_reply", label: messages.session.cards.ifReply, value: asTextList(payload.plan_if_reply) },
    { key: "plan_if_no_reply", label: messages.session.cards.ifNoReply, value: asTextList(payload.plan_if_no_reply) },
    { key: "avoid_list", label: messages.session.cards.avoid, value: asTextList(payload.avoid_list) },
  ].filter((section) => (Array.isArray(section.value) ? section.value.length > 0 : Boolean(section.value)));
}
