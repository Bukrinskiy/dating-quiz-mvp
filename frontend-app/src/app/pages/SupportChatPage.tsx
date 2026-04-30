import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { appCopy } from "../copy";
import type { AppAuthApi } from "../types";
import { PrototypeIcon } from "../ui/icons";

type SupportChatPageProps = {
  authApi: AppAuthApi;
  onSubmit: (text: string) => Promise<void>;
};

export function SupportChatPage({ onSubmit }: SupportChatPageProps) {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <section className="support-success">
        <div className="support-success__icon">
          <PrototypeIcon.shield />
        </div>
        <h1>Отправлено</h1>
        <p>{appCopy.support.success}</p>
        <button className="button button--primary button--md" onClick={() => navigate("/app")} type="button">
          На главную
        </button>
      </section>
    );
  }

  return (
    <section className="stack-page">
      <div className="page-heading">
        <h1>{appCopy.support.title}</h1>
        <p>Доступ, оплата, баг или другое</p>
      </div>
      <label className="support-card">
        <textarea placeholder="Опиши подробно…" rows={9} value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <button
        className="button button--primary button--lg button--full"
        disabled={busy || !text.trim()}
        onClick={async () => {
          setBusy(true);
          await onSubmit(text.trim());
          setSent(true);
          setBusy(false);
        }}
        type="button"
      >
        {busy ? "Отправляем…" : appCopy.support.submit}
      </button>
    </section>
  );
}
