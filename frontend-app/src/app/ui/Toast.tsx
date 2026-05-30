import type { ToastItem } from "../types";
import { useI18n } from "../i18n";
import { PrototypeIcon } from "./icons";

type ToastViewportProps = {
  items: ToastItem[];
  onDismiss: (id: string) => void;
};

export function ToastViewport({ items, onDismiss }: ToastViewportProps) {
  const { messages } = useI18n();
  return (
    <div className="toast-stack" aria-live="polite">
      {items.map((item) => (
        <article className={`toast toast--${item.tone || "default"}`} key={item.id}>
          <div className="toast__copy">
            {item.title ? <strong>{item.title}</strong> : null}
            <p>{item.message}</p>
          </div>
          <div className="toast__actions">
            {item.action ? (
              <button className="toast__action" onClick={() => void item.action?.onClick()}>
                {item.action.label}
              </button>
            ) : null}
            <button aria-label={messages.shell.close} className="toast__dismiss" onClick={() => onDismiss(item.id)}>
              <PrototypeIcon.close />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
