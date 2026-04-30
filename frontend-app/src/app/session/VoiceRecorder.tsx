import { useCallback, useEffect, useRef, useState } from "react";

import { appCopy } from "../copy";
import { PrototypeIcon } from "../ui/icons";
import { triggerHaptic } from "../../shared/haptics";

type VoiceRecorderProps = {
  busy: boolean;
  expanded?: boolean;
  autoStart?: boolean;
  onFinish?: () => void;
  onRecorded: (file: File) => Promise<void>;
  onDenied: () => void;
};

const normalizeAudioMimeType = (mimeType: string) => mimeType.split(";")[0]?.trim().toLowerCase() || "audio/webm";

const audioExtensionForMimeType = (mimeType: string) => {
  const normalized = normalizeAudioMimeType(mimeType);
  if (normalized === "audio/webm") {
    return "webm";
  }
  if (normalized === "audio/wav" || normalized === "audio/x-wav") {
    return "wav";
  }
  if (normalized === "audio/mp4" || normalized === "audio/m4a" || normalized === "audio/x-m4a") {
    return "m4a";
  }
  if (normalized === "audio/mpeg" || normalized === "audio/mp3") {
    return "mp3";
  }
  return "webm";
};

const buildAudioFile = (blob: Blob) => {
  const mimeType = normalizeAudioMimeType(blob.type);
  const extension = audioExtensionForMimeType(mimeType);
  return new File([blob], `telegram-audio-${new Date().toISOString().replaceAll(":", "-")}.${extension}`, {
    type: mimeType,
  });
};

export function VoiceRecorder({ busy, expanded = false, autoStart = false, onFinish, onRecorded, onDenied }: VoiceRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(
    () => () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const stopRecording = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      stopStream();
      return;
    }

    await new Promise<void>((resolve) => {
      recorder.addEventListener(
        "stop",
        async () => {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/ogg" });
          chunksRef.current = [];
          mediaRecorderRef.current = null;
          stopStream();
          if (blob.size > 0) {
            triggerHaptic("confirm");
            await onRecorded(buildAudioFile(blob));
          }
          resolve();
        },
        { once: true },
      );
      recorder.stop();
    });
  };

  const startRecording = useCallback(
    async () => {
      setStarting(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported("audio/ogg;codecs=opus") ? "audio/ogg;codecs=opus" : "audio/webm";
        const recorder = new MediaRecorder(stream, { mimeType });
        streamRef.current = stream;
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];
        setSeconds(0);
        setRecording(true);
        triggerHaptic("send");
        recorder.addEventListener("dataavailable", (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        });
        recorder.start();
        timerRef.current = window.setInterval(() => setSeconds((current) => current + 1), 1000);
      } catch {
        onDenied();
      } finally {
        setStarting(false);
      }
    },
    [onDenied],
  );

  useEffect(() => {
    if (!autoStart || recording || starting || busy || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return;
    }
    void startRecording();
  }, [autoStart, busy, recording, startRecording, starting]);

  const stopLabel = recording || starting;

  const handleToggle = async () => {
    if (busy || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onDenied();
      return;
    }
    if (starting) {
      return;
    }
    if (recording) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecording(false);
      setStarting(false);
      onFinish?.();
      void stopRecording();
      return;
    }
    try {
      await startRecording();
    } catch {
      onDenied();
    }
  };

  return (
    <button
      aria-label={stopLabel ? appCopy.session.voiceRecording : appCopy.session.voiceHoldToRecord}
      className={`voice-recorder${stopLabel ? " is-recording" : " is-idle"}${expanded ? " voice-recorder--expanded" : ""}`}
      disabled={busy}
      onClick={() => void handleToggle()}
      type="button"
    >
      <span className="voice-recorder__icon" aria-hidden="true">
        <PrototypeIcon.mic color="var(--accent)" />
      </span>
      <span className="voice-recorder__label">
        {stopLabel ? `${appCopy.session.voiceRecording} ${formatDuration(seconds)}` : appCopy.session.voiceHoldToRecord}
      </span>
      {stopLabel ? (
        <span className="voice-recorder__meter" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      ) : null}
    </button>
  );
}

function formatDuration(value: number) {
  const minutes = String(Math.floor(value / 60)).padStart(2, "0");
  const seconds = String(value % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
