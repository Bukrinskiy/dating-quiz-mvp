import { useState } from "react";

import { useI18n } from "../i18n";

type RefineChipsProps = {
  busy: boolean;
  onRefine: (command: string) => Promise<void>;
};

export function RefineChips({ busy, onRefine }: RefineChipsProps) {
  const { messages } = useI18n();
  const [custom, setCustom] = useState("");

  return (
    <div className="refine-box">
      <h2>{messages.session.refineTitle}</h2>
      <div className="refine-box__chips">
        {messages.session.refinePresets.map((item) => (
          <button className="chip" disabled={busy} key={item} onClick={() => void onRefine(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="composer composer--compact">
        <textarea
          className="composer__input"
          placeholder={messages.session.refinePlaceholder}
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
        />
        <button
          className="app-button app-button--primary"
          disabled={busy || !custom.trim()}
          onClick={async () => {
            await onRefine(custom);
            setCustom("");
          }}
        >
          {messages.session.refineSend}
        </button>
      </div>
    </div>
  );
}
