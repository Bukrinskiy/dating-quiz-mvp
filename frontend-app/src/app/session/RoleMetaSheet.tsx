import { useEffect, useState } from "react";

import { appCopy, roleLabels } from "../copy";
import type { RoleMeta } from "../types";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";

type RoleMetaSheetProps = {
  open: boolean;
  value: RoleMeta;
  onClose: () => void;
  onApply: (value: RoleMeta) => void;
};

export function RoleMetaSheet({ open, value, onClose, onApply }: RoleMetaSheetProps) {
  const [draft, setDraft] = useState<RoleMeta>(value);

  useEffect(() => {
    if (open) {
      setDraft(value);
    }
  }, [open, value]);

  return (
    <BottomSheet onClose={onClose} open={open} title={appCopy.session.roleTitle}>
      <p className="sheet-copy">{appCopy.session.roleHint}</p>
      <div className="sheet-choice-grid">
        {Object.entries(roleLabels).map(([role, label]) => (
          <button
            className={`sheet-choice${draft.role === role ? " is-active" : ""}`}
            key={role}
            onClick={() => setDraft((current) => ({ ...current, role: role as RoleMeta["role"] }))}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="sheet-field">
        <span>{appCopy.session.roleName}</span>
        <input value={draft.display_name} onChange={(event) => setDraft((current) => ({ ...current, display_name: event.target.value }))} />
      </label>
      <label className="sheet-field">
        <span>{appCopy.session.roleDate}</span>
        <input
          type="datetime-local"
          value={draft.sent_at}
          onChange={(event) => setDraft((current) => ({ ...current, sent_at: event.target.value }))}
        />
      </label>
      <Button
        fullWidth
        onClick={() => {
          onApply(draft);
          onClose();
        }}
      >
        {appCopy.session.roleApply}
      </Button>
    </BottomSheet>
  );
}
