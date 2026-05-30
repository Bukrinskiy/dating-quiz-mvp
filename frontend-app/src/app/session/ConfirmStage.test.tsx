import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { renderWithI18n } from "../../test/renderWithI18n";
import { ConfirmStage } from "./ConfirmStage";

const messages = [
  { id: "1", kind: "text" as const, role: "USER_SELF" as const, text: "[text] Первое сообщение" },
  { id: "2", kind: "audio" as const, role: "USER_PEER" as const, text: "[ГОЛОСОВОЕ] Ответ голосом" },
];

test("ConfirmStage calls onEdit when user wants to уточнить", async () => {
  const user = userEvent.setup();
  const onEdit = vi.fn();

  renderWithI18n(
    <ConfirmStage
      busy={false}
      messages={messages}
      onBack={vi.fn()}
      onConfirm={vi.fn(async () => undefined)}
      onEdit={onEdit}
      preview="[text] Контекст\n[edit] Уточнение"
    />,
    { locale: "ru" },
  );

  const contextSection = screen.getByRole("region", { name: "Контекст" });

  expect(screen.getByRole("heading", { name: "Контекст" })).toBeInTheDocument();
  expect(within(contextSection).getByText("Сообщение")).toBeInTheDocument();
  expect(within(contextSection).getByText("Голосовое")).toBeInTheDocument();
  expect(within(contextSection).getByText("Первое сообщение")).toBeInTheDocument();
  expect(within(contextSection).getByText("Ответ голосом")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Уточнить" }));

  expect(onEdit).toHaveBeenCalledTimes(1);
});
