import { useState } from "react";

import { appCopy } from "../copy";

type RefineChipsProps = {
  busy: boolean;
  onRefine: (command: string) => Promise<void>;
};

export function RefineChips({ busy, onRefine }: RefineChipsProps) {
  const [custom, setCustom] = useState("");

  return (
    <div className="refine-box">
      <h2>{appCopy.session.refineTitle}</h2>
      <div className="refine-box__chips">
        {appCopy.session.refinePresets.map((item) => (
          <button className="chip" disabled={busy} key={item} onClick={() => void onRefine(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="composer composer--compact">
        <textarea
          className="composer__input"
          placeholder={appCopy.session.refinePlaceholder}
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
          {appCopy.session.refineSend}
        </button>
      </div>
    </div>
  );
}
