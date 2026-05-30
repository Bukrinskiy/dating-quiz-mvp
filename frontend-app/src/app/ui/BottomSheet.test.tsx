import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

test("BottomSheet slide animations share one motion contract", () => {
  const css = readFileSync(resolve(process.cwd(), "src/styles/sheets.css"), "utf8");

  expect(css).toContain("--sheet-motion-duration: 420ms;");
  expect(css).toContain("--sheet-motion-easing: cubic-bezier(0.22, 1, 0.36, 1);");
  expect(css).toContain("animation: sheet-slide-in var(--sheet-motion-duration) var(--sheet-motion-easing) both;");
  expect(css).toContain("animation: sheet-slide-out var(--sheet-motion-duration) var(--sheet-motion-easing) both;");
  expect(css).toContain("animation: sheet-backdrop-in var(--sheet-motion-duration) var(--sheet-motion-easing) both;");
  expect(css).toContain("animation: sheet-backdrop-out var(--sheet-motion-duration) var(--sheet-motion-easing) both;");
});
