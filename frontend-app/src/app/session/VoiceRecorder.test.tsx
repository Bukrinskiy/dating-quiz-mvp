import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { VoiceRecorder } from "./VoiceRecorder";

test("VoiceRecorder falls back when media recording is unavailable", async () => {
  const user = userEvent.setup();
  const onDenied = vi.fn();

  render(<VoiceRecorder busy={false} onDenied={onDenied} onRecorded={vi.fn(async () => undefined)} />);

  await user.click(screen.getByRole("button", { name: "Нажми для записи" }));

  expect(onDenied).toHaveBeenCalled();
});

test("VoiceRecorder starts and stops recording on click", async () => {
  const user = userEvent.setup();
  const onRecorded = vi.fn(async () => undefined);
  const getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] }));

  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });

  class MediaRecorderMock {
    static isTypeSupported() {
      return false;
    }

    state = "inactive";
    mimeType = "audio/webm";
    private listeners = new Map<string, Array<() => void>>();

    start() {
      this.state = "recording";
    }

    stop() {
      this.state = "inactive";
      for (const listener of this.listeners.get("dataavailable") ?? []) {
        listener({ data: new Blob(["audio"], { type: "audio/webm" }) } as Event);
      }
      for (const listener of this.listeners.get("stop") ?? []) {
        listener();
      }
    }

    addEventListener(name: string, handler: EventListenerOrEventListenerObject) {
      const listener = typeof handler === "function" ? handler : () => handler.handleEvent(new Event(name));
      this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener as () => void]);
    }
  }

  vi.stubGlobal("MediaRecorder", MediaRecorderMock as unknown as typeof MediaRecorder);

  render(<VoiceRecorder busy={false} onDenied={vi.fn()} onRecorded={onRecorded} />);

  await user.click(screen.getByRole("button", { name: "Нажми для записи" }));

  await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
  expect(screen.getByRole("button", { name: "Запись" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Запись" }));

  await waitFor(() => expect(onRecorded).toHaveBeenCalledTimes(1));
});

test("VoiceRecorder calls onFinish immediately when stopping", async () => {
  const user = userEvent.setup();
  const onFinish = vi.fn();
  let resolveRecorded: (() => void) | null = null;
  const onRecorded = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        resolveRecorded = resolve;
      }),
  );
  const getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] }));

  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });

  class MediaRecorderMock {
    static isTypeSupported() {
      return false;
    }

    state = "inactive";
    mimeType = "audio/webm";
    private listeners = new Map<string, Array<() => void>>();

    start() {
      this.state = "recording";
    }

    stop() {
      this.state = "inactive";
      for (const listener of this.listeners.get("dataavailable") ?? []) {
        listener({ data: new Blob(["audio"], { type: "audio/webm" }) } as Event);
      }
      for (const listener of this.listeners.get("stop") ?? []) {
        listener();
      }
    }

    addEventListener(name: string, handler: EventListenerOrEventListenerObject) {
      const listener = typeof handler === "function" ? handler : () => handler.handleEvent(new Event(name));
      this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener as () => void]);
    }
  }

  vi.stubGlobal("MediaRecorder", MediaRecorderMock as unknown as typeof MediaRecorder);

  render(<VoiceRecorder busy={false} onDenied={vi.fn()} onFinish={onFinish} onRecorded={onRecorded} />);

  await user.click(screen.getByRole("button", { name: "Нажми для записи" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Запись" })).toBeInTheDocument());

  await user.click(screen.getByRole("button", { name: "Запись" }));

  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("button", { name: "Нажми для записи" })).toBeInTheDocument();

  resolveRecorded?.();
});
