import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import { ProfilePage } from "./ProfilePage";

const authApi = {
  auth: {
    user: { id: "1", email: "user@example.com", locale: "ru" },
    tokens: { access_token: "token", expires_in: 3600 },
    access: { has_access: true, access_status: "active", plan: "base", expires_at: "2026-05-01T00:00:00+00:00" },
  },
  setAuth: vi.fn(),
  refreshAuth: vi.fn(async () => null),
  logout: vi.fn(async () => undefined),
};

test("ProfilePage toggles theme", async () => {
  const user = userEvent.setup();
  const onThemeChange = vi.fn();

  render(
    <MemoryRouter>
      <ProfilePage authApi={authApi} onThemeChange={onThemeChange} theme="light" />
    </MemoryRouter>,
  );

  await user.click(screen.getByRole("button", { name: /Светлая тема/i }));

  expect(onThemeChange).toHaveBeenCalledWith("dark");
});

test("ProfilePage shows subscription expiry date instead of plan code", () => {
  render(
    <MemoryRouter>
      <ProfilePage authApi={authApi} onThemeChange={vi.fn()} theme="light" />
    </MemoryRouter>,
  );

  expect(screen.getByText("до 01.05.2026")).toBeInTheDocument();
  expect(screen.queryByText("base")).not.toBeInTheDocument();
});
