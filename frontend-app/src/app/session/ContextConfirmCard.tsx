import { useState } from "react";

import { appCopy } from "../copy";

type ContextConfirmCardProps = {
  busy: boolean;
  preview: string;
  onConfirm: () => Promise<void>;
  onEdit: (value: string) => Promise<void>;
};

export function ContextConfirmCard({ busy, preview, onConfirm, onEdit }: ContextConfirmCardProps) {
  const [editText, setEditText] = useState("");

  return (
    <section className="card-stack">
      <article className="detail-card">
        <h2>{appCopy.session.confirmTitle}</h2>
        <p>{appCopy.session.confirmBody}</p>
        <pre className="detail-card__preview">{preview}</pre>
      </article>
      <div className="composer composer--compact">
        <textarea
          className="composer__input"
          placeholder={appCopy.session.confirmEditPlaceholder}
          value={editText}
          onChange={(event) => setEditText(event.target.value)}
        />
        <div className="composer__actions">
          <button className="app-button app-button--ghost" disabled={busy || !editText.trim()} onClick={() => void onEdit(editText)}>
            {appCopy.session.confirmEdit}
          </button>
          <button className="app-button app-button--primary" disabled={busy} onClick={() => void onConfirm()}>
            {appCopy.session.confirmYes}
          </button>
        </div>
      </div>
    </section>
  );
}
