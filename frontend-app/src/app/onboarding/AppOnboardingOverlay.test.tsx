import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { vi } from "vitest";

import { renderWithI18n } from "../../test/renderWithI18n";
import { INSTALL_HINT_STORAGE_KEY, ONBOARDING_STORAGE_KEY } from "../local-state";
import { AppOnboardingOverlay } from "./AppOnboardingOverlay";

function LocationProbe() {
  const location = useLocation();
  return <div>{`${location.pathname}${location.search}`}</div>;
}

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  });
});

test("AppOnboardingOverlay shows full onboarding on paywall for users without dismissed flags", () => {
  renderWithI18n(
    <MemoryRouter initialEntries={["/paywall"]}>
      <AppOnboardingOverlay enabled />
    </MemoryRouter>,
    { locale: "ru" },
  );

  expect(screen.getByText("Сначала установи Flirto Guru")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Далее" })).toBeInTheDocument();
});

test("AppOnboardingOverlay shows install-only hint for onboarded browser users on paywall", () => {
  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");

  renderWithI18n(
    <MemoryRouter initialEntries={["/paywall"]}>
      <AppOnboardingOverlay enabled />
    </MemoryRouter>,
    { locale: "ru" },
  );

  expect(screen.getByText("Сначала установи Flirto Guru")).toBeInTheDocument();
  expect(screen.queryByText("Добавь контекст")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Установить" })).toBeInTheDocument();
});

test("AppOnboardingOverlay keeps full onboarding on app route for paid users", () => {
  renderWithI18n(
    <MemoryRouter initialEntries={["/app"]}>
      <AppOnboardingOverlay enabled />
    </MemoryRouter>,
    { locale: "ru" },
  );

  expect(screen.getByText("Сначала установи Flirto Guru")).toBeInTheDocument();
});

test("AppOnboardingOverlay clears forced onboarding query on dismiss without leaving current route", async () => {
  const user = userEvent.setup();
  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
  window.localStorage.setItem(INSTALL_HINT_STORAGE_KEY, "1");

  renderWithI18n(
    <MemoryRouter initialEntries={["/paywall?onboarding=1"]}>
      <AppOnboardingOverlay enabled />
      <LocationProbe />
    </MemoryRouter>,
    { locale: "ru" },
  );

  await user.click(screen.getByRole("button", { name: "Пропустить" }));

  expect(screen.getByText("/paywall")).toBeInTheDocument();
  expect(screen.queryByText("/paywall?onboarding=1")).not.toBeInTheDocument();
});

test("AppOnboardingOverlay install button consumes native install prompt", async () => {
  const user = userEvent.setup();
  const prompt = vi.fn(async () => undefined);
  const event = new Event("beforeinstallprompt") as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted"; platform: string }>;
  };
  event.prompt = prompt;
  event.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });
  window.dispatchEvent(event);

  renderWithI18n(
    <MemoryRouter initialEntries={["/paywall"]}>
      <AppOnboardingOverlay enabled />
    </MemoryRouter>,
    { locale: "ru" },
  );

  await user.click(screen.getByRole("button", { name: "Установить" }));

  expect(prompt).toHaveBeenCalledTimes(1);
});

test("AppOnboardingOverlay keeps install button and shows manual hint when native install is unavailable", async () => {
  const user = userEvent.setup();

  renderWithI18n(
    <MemoryRouter initialEntries={["/paywall"]}>
      <AppOnboardingOverlay enabled />
    </MemoryRouter>,
    { locale: "ru" },
  );

  await user.click(screen.getByRole("button", { name: "Установить" }));

  expect(screen.getByText("Если окно установки не открылось, используй значок установки в адресной строке или меню браузера.")).toBeInTheDocument();
});
