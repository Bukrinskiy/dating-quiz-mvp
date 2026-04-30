import { render, screen } from "@testing-library/react";
import { act } from "react";
import { vi } from "vitest";

import { GenerateStage } from "./GenerateStage";

test("GenerateStage advances hint progression", () => {
  vi.useFakeTimers();

  render(<GenerateStage active />);
  expect(screen.getByText("Анализирую контекст…")).toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(1800);
  });
  expect(screen.getByText("Формулирую совет…")).toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(1800);
  });
  expect(screen.getByText("Почти готово…")).toBeInTheDocument();

  vi.useRealTimers();
});
