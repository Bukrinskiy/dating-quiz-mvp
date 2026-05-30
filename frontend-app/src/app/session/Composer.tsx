import { useEffect, useRef, useState } from "react";

import { useI18n } from "../i18n";
import type { RoleMeta } from "../types";
import { PrototypeIcon } from "../ui/icons";
import { triggerHaptic } from "../../shared/haptics";
import { VoiceRecorder } from "./VoiceRecorder";

type ComposerProps = {
  busy: boolean;
  meta: RoleMeta;
  onSendAudio: (file: File) => Promise<void>;
  onAudioDenied: () => void;
  onSendImage: (file: File) => Promise<void>;
  onOpenRoleMeta: () => void;
  onSend: (text: string, meta: RoleMeta) => Promise<void>;
};

export function Composer({ busy, meta, onAudioDenied, onSendAudio, onSendImage, onOpenRoleMeta, onSend }: ComposerProps) {
  const { messages } = useI18n();
  const [value, setValue] = useState("");
  const [voiceMode, setVoiceMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const isVoiceRecordingMode = voiceMode && !value.trim();

  void onOpenRoleMeta;

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }
    element.style.height = "0px";
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
  }, [value]);

  return (
    <div className="composer composer--session">
      <div className={`composer__shell${isVoiceRecordingMode ? " composer__shell--voice" : ""}`}>
        {isVoiceRecordingMode ? null : (
          <button
            aria-label={messages.session.attach}
            className="composer__icon"
            onClick={() => imageInputRef.current?.click()}
            type="button"
          >
            <PrototypeIcon.image color="var(--accent)" />
          </button>
        )}
        <input
          ref={imageInputRef}
          accept="image/*"
          className="upload-option__input"
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void onSendImage(file);
            }
            event.target.value = "";
          }}
        />
        {isVoiceRecordingMode ? (
          <VoiceRecorder
            autoStart
            busy={busy}
            expanded
            onDenied={() => {
              setVoiceMode(false);
              onAudioDenied();
            }}
            onFinish={() => setVoiceMode(false)}
            onRecorded={async (file) => {
              await onSendAudio(file);
            }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            className="composer__input"
            placeholder={messages.session.composerPlaceholder}
            rows={1}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (event.target.value.trim()) {
                setVoiceMode(false);
              }
            }}
            onKeyDown={async (event) => {
              if (event.key !== "Enter" || event.shiftKey || !value.trim() || busy) {
                return;
              }
              event.preventDefault();
              triggerHaptic("send");
              await onSend(value, meta);
              setValue("");
            }}
          />
        )}
        {value.trim() ? (
          <button
            aria-label={messages.session.send}
            className="composer__icon composer__icon--primary"
            disabled={busy}
            onClick={async () => {
              triggerHaptic("send");
              await onSend(value, meta);
              setValue("");
            }}
            type="button"
          >
            <PrototypeIcon.send />
          </button>
        ) : voiceMode ? null : (
          <button
            aria-label={messages.session.voiceHoldToRecord}
            className="composer__icon"
            disabled={busy}
            onClick={() => setVoiceMode(true)}
            type="button"
          >
            <PrototypeIcon.mic color="var(--accent)" />
          </button>
        )}
      </div>
    </div>
  );
}
