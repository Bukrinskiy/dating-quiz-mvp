import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { vi } from "vitest";

import { renderWithI18n } from "../../test/renderWithI18n";
import * as appApi from "../api";
import * as accessStatusHooks from "../hooks/useAccessStatus";
import { INSTALL_HINT_STORAGE_KEY, ONBOARDING_STORAGE_KEY } from "../local-state";
import { ProfilePage } from "./ProfilePage";
import { buildAppAccessEmailUrl } from "./paywallCheckout";

const authApi = {
  auth: {
    user: { id: "1", email: "user@example.com", locale: "en" },
    tokens: { access_token: "token", expires_in: 3600 },
    access: { has_access: true, access_status: "active", plan: "base", expires_at: "2026-05-01T00:00:00+00:00" },
  },
  setAuth: vi.fn(),
  refreshAuth: vi.fn(async () => null),
  logout: vi.fn(async () => undefined),
};

function LocationProbe() {
  const location = useLocation();
  return <div>{`${location.pathname}${location.search}`}</div>;
}

beforeEach(() => {
  vi.spyOn(accessStatusHooks, "useAccessStatus").mockReturnValue({
    status: authApi.auth.access,
    refresh: vi.fn(async () => authApi.auth.access),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("ProfilePage toggles theme", async () => {
  const user = userEvent.setup();
  const onThemeChange = vi.fn();

  renderWithI18n(
    <MemoryRouter>
      <ProfilePage authApi={authApi} onLocaleChange={vi.fn()} onThemeChange={onThemeChange} theme="light" />
    </MemoryRouter>,
  );

  await user.click(screen.getByRole("button", { name: /Light theme/i }));

  expect(onThemeChange).toHaveBeenCalledWith("dark");
});

test("ProfilePage shows subscription expiry date instead of plan code", () => {
  renderWithI18n(
    <MemoryRouter>
      <ProfilePage authApi={authApi} onLocaleChange={vi.fn()} onThemeChange={vi.fn()} theme="light" />
    </MemoryRouter>,
  );

  expect(screen.getByText("valid until 05/01/2026")).toBeInTheDocument();
  expect(screen.queryByText("base")).not.toBeInTheDocument();
});

test("ProfilePage switches language from profile sheet", async () => {
  const user = userEvent.setup();
  const onLocaleChange = vi.fn(async () => undefined);

  renderWithI18n(
    <MemoryRouter>
      <ProfilePage authApi={authApi} onLocaleChange={onLocaleChange} onThemeChange={vi.fn()} theme="light" />
    </MemoryRouter>,
  );

  await user.click(screen.getByRole("button", { name: /Language/i }));
  expect(screen.getByRole("button", { name: "Français" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Español" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Русский" }));

  expect(onLocaleChange).toHaveBeenCalledWith("ru");
});

test("ProfilePage assistance section can replay onboarding", async () => {
  const user = userEvent.setup();
  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
  window.localStorage.setItem(INSTALL_HINT_STORAGE_KEY, "1");

  renderWithI18n(
    <MemoryRouter initialEntries={["/app/profile"]}>
      <Routes>
        <Route
          path="/app/profile"
          element={
            <>
              <ProfilePage authApi={authApi} onLocaleChange={vi.fn()} onThemeChange={vi.fn()} theme="light" />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
    { locale: "ru" },
  );

  await user.click(screen.getByRole("button", { name: "Показать обучение заново" }));

  expect(window.localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
  expect(window.localStorage.getItem(INSTALL_HINT_STORAGE_KEY)).toBeNull();
  expect(screen.getByText("/app/profile?onboarding=1")).toBeInTheDocument();
});

test("ProfilePage exposes in-app legal document links", () => {
  renderWithI18n(
    <MemoryRouter>
      <ProfilePage authApi={authApi} onLocaleChange={vi.fn()} onThemeChange={vi.fn()} theme="light" />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: /Terms of Use/i })).toHaveAttribute("href", "/legal/terms");
  expect(screen.getByRole("link", { name: /Privacy Policy/i })).toHaveAttribute("href", "/legal/privacy");
  expect(screen.getByRole("link", { name: /Refund Policy/i })).toHaveAttribute("href", "/legal/refund");
  expect(screen.getByText("Service rules and user responsibilities")).toBeInTheDocument();
  expect(screen.queryByText("Shared legal documents")).not.toBeInTheDocument();
});

test("ProfilePage shows inactive subscription state and starts checkout", async () => {
  const user = userEvent.setup();
  const createQuizSession = vi.spyOn(appApi, "createQuizSession").mockResolvedValue({ uuid: "quiz-123" });
  const redirectTo = vi.fn();
  const inactiveAuthApi = {
    ...authApi,
    auth: {
      ...authApi.auth,
      access: { has_access: false, access_status: "expired", plan: null, expires_at: null },
    },
  };
  vi.spyOn(accessStatusHooks, "useAccessStatus").mockReturnValue({
    status: inactiveAuthApi.auth.access,
    refresh: vi.fn(async () => inactiveAuthApi.auth.access),
  });

  renderWithI18n(
    <MemoryRouter>
      <ProfilePage
        authApi={inactiveAuthApi}
        onLocaleChange={vi.fn()}
        onThemeChange={vi.fn()}
        redirectTo={redirectTo}
        theme="light"
      />
    </MemoryRouter>,
  );

  expect(screen.getByText("Activation required")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /Open payment/i }));

  expect(createQuizSession).toHaveBeenCalledWith({
    locale: "en",
    clickid: "app_access",
    brand: "flirto_guru",
    landing_id: "app_access",
    entry_host: window.location.host,
    entry_path: "/paywall",
    tracking_params: {
      source: "app",
      surface: "frontend-app",
      flow: "access_paywall",
    },
    answers: {
      source: "app_access",
      app_access_checkout: true,
    },
  });
  expect(redirectTo).toHaveBeenCalledWith(buildAppAccessEmailUrl("quiz-123", "user@example.com"));
});
