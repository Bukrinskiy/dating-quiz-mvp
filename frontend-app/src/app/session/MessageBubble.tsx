import { useMemo, useRef, useState } from "react";

import { appCopy, roleLabels } from "../copy";
import type { SessionMessage } from "../types";
import { PrototypeIcon } from "../ui/icons";
import { getVisibleAuthorLabel } from "./messageAuthor";

type MessageBubbleProps = {
  message: SessionMessage;
  deleting?: boolean;
  canDelete?: boolean;
  swipeOpen?: boolean;
  onDeleteRequest?: (message: SessionMessage) => void;
  onSwipeClose?: () => void;
  onSwipeOpen?: () => void;
};

export const SWIPE_REVEAL_PX = 92;
export const SWIPE_OPEN_THRESHOLD_PX = 48;
const SWIPE_START_THRESHOLD_PX = 10;

export function MessageBubble({
  message,
  deleting = false,
  canDelete = false,
  swipeOpen = false,
  onDeleteRequest,
  onSwipeClose,
  onSwipeOpen,
}: MessageBubbleProps) {
  const visibleAuthorLabel = getVisibleAuthorLabel(message);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const dragOffsetRef = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const swipeDirection = message.role === "USER_SELF" ? -1 : 1;

  const offset = useMemo(() => {
    if (dragOffset !== null) {
      return dragOffset;
    }
    return swipeOpen ? swipeDirection * SWIPE_REVEAL_PX : 0;
  }, [dragOffset, swipeDirection, swipeOpen]);
  const showSwipeActions = canDelete && (swipeOpen || dragOffset !== null);

  const resetGesture = () => {
    startXRef.current = null;
    startYRef.current = null;
    draggingRef.current = false;
    dragOffsetRef.current = null;
    setDragOffset(null);
  };

  if (message.kind === "system") {
    return null;
  }

  return (
    <div
      className={`bubble-row bubble-row--${message.role === "USER_SELF" ? "self" : "peer"}${swipeOpen ? " is-open" : ""}${deleting ? " is-deleting" : ""}`}
    >
      <div className={`bubble-swipe bubble-swipe--${message.role === "USER_SELF" ? "self" : "peer"}`}>
        {showSwipeActions ? (
          <div className="bubble-swipe__actions">
            <button
              className="bubble-swipe__action bubble-swipe__action--danger"
              disabled={deleting}
              onClick={(event) => {
                event.stopPropagation();
                onDeleteRequest?.(message);
              }}
              aria-label={appCopy.session.deleteFragment}
              type="button"
            >
              <PrototypeIcon.trash />
            </button>
          </div>
        ) : null}

        <article
          className={`bubble bubble--${message.role === "USER_SELF" ? "self" : "peer"}${message.pending ? " bubble--pending" : ""}${deleting ? " bubble--deleting" : ""}`}
          onPointerCancel={resetGesture}
          onPointerDown={(event) => {
            if (deleting) {
              return;
            }
            startXRef.current = event.clientX;
            startYRef.current = event.clientY;
            draggingRef.current = false;
            setDragOffset(null);
          }}
          onPointerMove={(event) => {
            if (startXRef.current === null || startYRef.current === null || deleting) {
              return;
            }
            const dx = event.clientX - startXRef.current;
            const dy = event.clientY - startYRef.current;
            if (!canDelete || Math.abs(dx) <= SWIPE_START_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) {
              return;
            }
            if (swipeDirection === -1 && dx > 0) {
              return;
            }
            if (swipeDirection === 1 && dx < 0) {
              return;
            }
            draggingRef.current = true;
            suppressClickRef.current = true;
            const baseOffset = swipeOpen ? swipeDirection * SWIPE_REVEAL_PX : 0;
            const rawOffset = baseOffset + dx;
            const nextOffset =
              swipeDirection === -1
                ? Math.min(0, Math.max(-SWIPE_REVEAL_PX, rawOffset))
                : Math.max(0, Math.min(SWIPE_REVEAL_PX, rawOffset));
            dragOffsetRef.current = nextOffset;
            setDragOffset(nextOffset);
          }}
          onPointerUp={() => {
            if (draggingRef.current && canDelete) {
              const finalOffset = dragOffsetRef.current ?? offset;
              if (Math.abs(finalOffset) >= SWIPE_OPEN_THRESHOLD_PX) {
                onSwipeOpen?.();
              } else {
                onSwipeClose?.();
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
        >
          {visibleAuthorLabel || message.sentAt ? (
            <header className="bubble__meta">
              <strong>{visibleAuthorLabel || (message.role ? roleLabels[message.role] : "Контекст")}</strong>
              {message.sentAt ? <span>{message.sentAt}</span> : null}
            </header>
          ) : null}
          <p className="bubble__text">
            <span>{message.text}</span>
            {message.pending ? <span aria-hidden="true" className="bubble__spinner" /> : null}
          </p>
          {message.pending ? <span className="bubble__pending" /> : null}
        </article>
      </div>
    </div>
  );
}
