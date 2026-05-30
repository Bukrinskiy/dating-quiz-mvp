import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PropsWithChildren, ReactNode } from "react";
import { PrototypeIcon } from "./icons";

type BottomSheetProps = PropsWithChildren<{
  open: boolean;
  title: string;
  onClose: () => void;
}>;

const DISMISS_THRESHOLD = 90;
// Keep in sync with --sheet-motion-duration in sheets.css.
const EXIT_DURATION_MS = 420;

export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  const startY = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [rendered, setRendered] = useState(open);
  const [sheetState, setSheetState] = useState<"open" | "closed">(open ? "open" : "closed");
  const [content, setContent] = useState<{ title: string; children: ReactNode }>({ title, children });

  const resetDrag = () => {
    startY.current = null;
    setOffset(0);
    setDragging(false);
  };

  useEffect(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    if (open) {
      setContent({ title, children });
      setRendered(true);
      animationFrameRef.current = window.requestAnimationFrame(() => {
        setSheetState("open");
        animationFrameRef.current = null;
      });
      return;
    }

    setSheetState("closed");
    resetDrag();
    closeTimeoutRef.current = window.setTimeout(() => {
      setRendered(false);
      closeTimeoutRef.current = null;
    }, EXIT_DURATION_MS);
  }, [children, open, title]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  if (!rendered) {
    return null;
  }

  return (
    <div className="sheet-backdrop" data-state={sheetState} onClick={onClose} role="presentation">
      <section
        className="sheet"
        data-dragging={dragging ? "true" : "false"}
        data-state={sheetState}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && event.animationName === "sheet-slide-out" && !open && sheetState === "closed") {
            if (closeTimeoutRef.current !== null) {
              window.clearTimeout(closeTimeoutRef.current);
              closeTimeoutRef.current = null;
            }
            setRendered(false);
          }
        }}
        onClick={(event) => event.stopPropagation()}
        style={{ "--sheet-drag-offset": `${offset}px` } as CSSProperties}
      >
        <div
          className="sheet__handle"
          onPointerCancel={resetDrag}
          onPointerDown={(event) => {
            startY.current = event.clientY;
            setDragging(true);
          }}
          onPointerMove={(event) => {
            if (startY.current === null) {
              return;
            }
            setOffset(Math.max(0, event.clientY - startY.current));
          }}
          onPointerUp={() => {
            if (offset > DISMISS_THRESHOLD) {
              onClose();
            }
            resetDrag();
          }}
        />
        <header className="sheet__header">
          <h2>{content.title}</h2>
          <button className="sheet__close" onClick={onClose} type="button">
            <PrototypeIcon.close />
          </button>
        </header>
        <div className="sheet__body">{content.children}</div>
      </section>
    </div>
  );
}
