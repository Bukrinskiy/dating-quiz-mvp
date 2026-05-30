import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useI18n } from "../i18n";
import type { AppAuthApi } from "../types";
import { PrototypeIcon } from "../ui/icons";

type SupportChatPageProps = {
  authApi: AppAuthApi;
  onSubmit: (text: string) => Promise<void>;
};

export function SupportChatPage({ onSubmit }: SupportChatPageProps) {
  const navigate = useNavigate();
  const { messages } = useI18n();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <section className="support-success">
        <div className="support-success__icon">
          <PrototypeIcon.shield />
        </div>
        <h1>{messages.support.successTitle}</h1>
        <p>{messages.support.success}</p>
        <button className="button button--primary button--md" onClick={() => navigate("/app")} type="button">
          {messages.support.homeCta}
        </button>
      </section>
    );
  }

  return (
    <section className="stack-page">
      <div className="page-heading">
        <h1>{messages.support.title}</h1>
        <p>{messages.support.subtitle}</p>
      </div>
      <label className="support-card">
        <textarea placeholder={messages.support.detailPlaceholder} rows={9} value={text} onChange={(event) => setText(event.target.value)} />
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
        {busy ? messages.support.submitting : messages.support.submit}
      </button>
    </section>
  );
}
