import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import { createAppApi } from "../api";
import { AppHomePage } from "./AppHomePage";
import { ONBOARDING_STORAGE_KEY } from "../local-state";

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return {
    ...actual,
    createAppApi: vi.fn(),
  };
});

const mockedCreateAppApi = vi.mocked(createAppApi);

const authApi = {
  auth: {
    user: { id: "1", email: "user@example.com", locale: "ru" },
    tokens: { access_token: "token", expires_in: 3600 },
    access: { has_access: true, access_status: "active", plan: "base" },
  },
  setAuth: vi.fn(),
  refreshAuth: vi.fn(async () => null),
  logout: vi.fn(async () => undefined),
};

test("AppHomePage stores onboarding dismissal", async () => {
  const user = userEvent.setup();
  window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  mockedCreateAppApi.mockReturnValue({ listSessions: vi.fn(async () => []) } as ReturnType<typeof createAppApi>);

  render(
    <MemoryRouter>
      <AppHomePage accessStatus={null} authApi={authApi} onStartMode={vi.fn(async () => "session-1")} />
    </MemoryRouter>,
  );

  expect(screen.getByText("Добавь контекст")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Пропустить" }));

  expect(window.localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe("1");
});

test("AppHomePage renders single consultation entry button", () => {
  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
  mockedCreateAppApi.mockReturnValue({ listSessions: vi.fn(async () => []) } as ReturnType<typeof createAppApi>);

  render(
    <MemoryRouter>
      <AppHomePage accessStatus={null} authApi={authApi} onStartMode={vi.fn(async () => "session-1")} />
    </MemoryRouter>,
  );

  expect(screen.getAllByText("Новая консультация")).toHaveLength(2);
  expect(screen.queryByText("ПАМАГИТИ")).not.toBeInTheDocument();
  expect(screen.queryByText("Одна точка входа")).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "U" })).not.toBeInTheDocument();
  expect(screen.queryByText("Что написать")).not.toBeInTheDocument();
  expect(screen.queryByText("Разобрать")).not.toBeInTheDocument();
});

test("AppHomePage shows the latest 10 recent sessions", async () => {
  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
  mockedCreateAppApi.mockReturnValue({
    listSessions: vi.fn(async () =>
      Array.from({ length: 12 }, (_, index) => ({
        session_id: `session-${index + 1}`,
        mode: index % 2 === 0 ? "write_now" : "analyze_case",
        status: "active",
        state: "done",
        created_at: new Date(Date.UTC(2026, 3, 20, index, 0, 0)).toISOString(),
        updated_at: new Date(Date.UTC(2026, 3, 20, index, 0, 0)).toISOString(),
        preview:
          index === 11
            ? "Диалог завис из-за неопределенности и слишком длинного сообщения"
            : `preview-${index + 1}`,
      })),
    ),
  } as ReturnType<typeof createAppApi>);

  const { container } = render(
    <MemoryRouter>
      <AppHomePage accessStatus={null} authApi={authApi} onStartMode={vi.fn(async () => "session-1")} />
    </MemoryRouter>,
  );

  await waitFor(() => expect(screen.getByText("Диалог завис из-за неопределенности и слишком дли...")).toBeInTheDocument());
  expect(screen.getByText("Диалог завис из-за неопределенности и слишком длинного сообщения")).toBeInTheDocument();
  expect(screen.getAllByText("Новая консультация")).toHaveLength(2);

  expect(screen.queryByText("preview-2")).not.toBeInTheDocument();
  expect(screen.queryByText("preview-1")).not.toBeInTheDocument();
  expect(container.querySelectorAll(".recent-item")).toHaveLength(10);
});
