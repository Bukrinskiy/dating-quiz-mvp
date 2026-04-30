import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { AttachmentSheet } from "./AttachmentSheet";

test("AttachmentSheet renders gallery camera and voice options", () => {
  render(
    <AttachmentSheet
      open
      onAudio={vi.fn()}
      onCamera={vi.fn()}
      onClose={vi.fn()}
      onEditMeta={vi.fn()}
      onImage={vi.fn()}
    />,
  );

  expect(screen.getByText("Галерея")).toBeInTheDocument();
  expect(screen.getByText("Камера")).toBeInTheDocument();
  expect(screen.getByText("Голосовое")).toBeInTheDocument();
});
