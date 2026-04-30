import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import { LoginPage } from "./LoginPage";

const authApi = {
  auth: null,
  setAuth: vi.fn(),
  refreshAuth: vi.fn(async () => null),
  logout: vi.fn(async () => undefined),
};

test("LoginPage reveals code field only after successful request", async () => {
  const user = userEvent.setup();
  const onRequestCode = vi.fn(async () => undefined);

  render(
    <MemoryRouter>
      <LoginPage authApi={authApi} onConfirmCode={vi.fn(async () => undefined)} onRequestCode={onRequestCode} />
    </MemoryRouter>,
  );

  expect(screen.queryByLabelText("Код из письма")).not.toBeInTheDocument();
  expect(screen.queryByText("Email связанный с оплатой или Telegram-ботом")).not.toBeInTheDocument();
  expect(screen.queryByText("Тот же доступ, что и в Telegram-боте.")).not.toBeInTheDocument();

  await user.type(screen.getByLabelText("Email"), "user@example.com");
  await user.click(screen.getByRole("button", { name: "Получить код →" }));

  await waitFor(() => expect(onRequestCode).toHaveBeenCalledWith("user@example.com"));
  expect(screen.getByLabelText("Код из письма")).toBeInTheDocument();
});

test("LoginPage shows spinner while requesting code", async () => {
  const user = userEvent.setup();
  let resolveRequest: (() => void) | null = null;
  const onRequestCode = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        resolveRequest = resolve;
      }),
  );

  render(
    <MemoryRouter>
      <LoginPage authApi={authApi} onConfirmCode={vi.fn(async () => undefined)} onRequestCode={onRequestCode} />
    </MemoryRouter>,
  );

  await user.type(screen.getByLabelText("Email"), "user@example.com");
  await user.click(screen.getByRole("button", { name: "Получить код →" }));

  expect(screen.getByRole("status")).toBeInTheDocument();
  resolveRequest?.();

  await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  expect(screen.getByLabelText("Код из письма")).toBeInTheDocument();
});
