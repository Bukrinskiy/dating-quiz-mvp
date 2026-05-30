import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import { renderWithI18n } from "../../test/renderWithI18n";
import { SupportChatPage } from "./SupportChatPage";

test("SupportChatPage shows success state after submit", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn(async () => undefined);

  renderWithI18n(
    <MemoryRouter>
      <SupportChatPage authApi={null as never} onSubmit={onSubmit} />
    </MemoryRouter>,
    { locale: "ru" },
  );

  await user.type(screen.getByPlaceholderText("Опиши подробно…"), "Нужна помощь");
  await user.click(screen.getByRole("button", { name: "Отправить" }));

  expect(onSubmit).toHaveBeenCalledWith("Нужна помощь");
  expect(screen.getByText("Отправлено")).toBeInTheDocument();
});
