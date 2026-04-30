import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { BottomSheet } from "./BottomSheet";

test("BottomSheet keeps content mounted while closing and unmounts after animation", () => {
  const onClose = vi.fn();
  const { rerender } = render(
    <BottomSheet open title="Точка рычага" onClose={onClose}>
      <p>Контент панели</p>
    </BottomSheet>,
  );

  expect(screen.getByRole("heading", { name: "Точка рычага" })).toBeInTheDocument();

  rerender(
    <BottomSheet open={false} title="" onClose={onClose}>
      {null}
    </BottomSheet>,
  );

  expect(screen.getByRole("heading", { name: "Точка рычага" })).toBeInTheDocument();
  expect(screen.getByText("Контент панели")).toBeInTheDocument();

  const sheet = screen.getByRole("heading", { name: "Точка рычага" }).closest("section");
  expect(sheet).toHaveAttribute("data-state", "closed");

  fireAnimationEnd(sheet!, "sheet-slide-in");
  expect(screen.getByRole("heading", { name: "Точка рычага" })).toBeInTheDocument();

  fireAnimationEnd(sheet!, "sheet-slide-out");

  expect(screen.queryByRole("heading", { name: "Точка рычага" })).not.toBeInTheDocument();
});

function fireAnimationEnd(element: Element, animationName: string) {
  const event = new Event("animationend", { bubbles: true });
  Object.defineProperty(event, "animationName", { value: animationName });
  fireEvent(element, event);
}
