import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { renderWithI18n } from "../../test/renderWithI18n";
import { Composer } from "./Composer";

test("Composer sends text with role metadata", async () => {
  const user = userEvent.setup();
  const onSend = vi.fn(async () => undefined);

  renderWithI18n(
    <Composer
      busy={false}
      meta={{ role: "USER_PEER", display_name: "Она", sent_at: "2026-04-14T10:30" }}
      onAudioDenied={vi.fn()}
      onOpenRoleMeta={vi.fn()}
      onSend={onSend}
      onSendAudio={vi.fn(async () => undefined)}
      onSendImage={vi.fn(async () => undefined)}
    />,
    { locale: "ru" },
  );

  await user.type(screen.getByPlaceholderText("Опиши ситуацию или вставь переписку…"), "Привет");
  await user.click(screen.getByRole("button", { name: "Отправить" }));

  expect(onSend).toHaveBeenCalledWith("Привет", {
    role: "USER_PEER",
    display_name: "Она",
    sent_at: "2026-04-14T10:30",
  });
});

test("Composer swaps textarea for recorder block after mic click", async () => {
  const user = userEvent.setup();
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

    start() {
      this.state = "recording";
    }

    stop() {
      this.state = "inactive";
    }

    addEventListener() {}
  }

  vi.stubGlobal("MediaRecorder", MediaRecorderMock as unknown as typeof MediaRecorder);

  renderWithI18n(
    <Composer
      busy={false}
      meta={{ role: "USER_PEER", display_name: "Она", sent_at: "2026-04-14T10:30" }}
      onAudioDenied={vi.fn()}
      onOpenRoleMeta={vi.fn()}
      onSend={vi.fn(async () => undefined)}
      onSendAudio={vi.fn(async () => undefined)}
      onSendImage={vi.fn(async () => undefined)}
    />,
    { locale: "ru" },
  );

  await user.click(screen.getByRole("button", { name: "Нажми для записи" }));

  await waitFor(() =>
    expect(screen.queryByPlaceholderText("Опиши ситуацию или вставь переписку…")).not.toBeInTheDocument(),
  );
  await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
  expect(screen.getByRole("button", { name: "Запись" })).toBeInTheDocument();
});
