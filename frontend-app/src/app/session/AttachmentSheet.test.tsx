import { screen } from "@testing-library/react";
import { vi } from "vitest";

import { renderWithI18n } from "../../test/renderWithI18n";
import { AttachmentSheet } from "./AttachmentSheet";

test("AttachmentSheet renders gallery camera and voice options", () => {
  renderWithI18n(
    <AttachmentSheet
      open
      onAudio={vi.fn()}
      onCamera={vi.fn()}
      onClose={vi.fn()}
      onEditMeta={vi.fn()}
      onImage={vi.fn()}
    />,
    { locale: "ru" },
  );

  expect(screen.getByText("Галерея")).toBeInTheDocument();
  expect(screen.getByText("Камера")).toBeInTheDocument();
  expect(screen.getByText("Голосовое")).toBeInTheDocument();
});
