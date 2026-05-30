import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { renderWithI18n } from "../../test/renderWithI18n";
import * as accessStatusHooks from "../hooks/useAccessStatus";
import { createAppApi, createQuizSession } from "../api";
import type { AuthPayload } from "../types";
import { PaywallPage } from "./PaywallPage";
import { buildAppAccessEmailUrl } from "./paywallCheckout";

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return {
    ...actual,
    createQuizSession: vi.fn(),
    createAppApi: vi.fn(),
  };
});

const mockedCreateQuizSession = vi.mocked(createQuizSession);
const mockedCreateAppApi = vi.mocked(createAppApi);

const activeAuth: AuthPayload = {
  user: { id: "1", email: "user@example.com", locale: "en" },
  tokens: { access_token: "token", expires_in: 3600 },
  access: { has_access: true, access_status: "active", plan: "base", expires_at: "2026-05-01T00:00:00+00:00" },
};

const inactiveAuth: AuthPayload = {
  ...activeAuth,
  access: { has_access: false, access_status: "expired", plan: null, expires_at: null },
};

describe("PaywallPage", () => {
  beforeEach(() => {
    mockedCreateQuizSession.mockReset();
    mockedCreateAppApi.mockReset();
    mockedCreateAppApi.mockReturnValue({
      redeemAccessCode: vi.fn(async () => activeAuth),
    } as ReturnType<typeof createAppApi>);
    vi.spyOn(accessStatusHooks, "useAccessStatus").mockReturnValue({
      status: activeAuth.access,
      refresh: vi.fn(async () => activeAuth.access),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("renders active access state with formatted expiry and actions", () => {
    renderWithI18n(
      <MemoryRouter initialEntries={["/paywall"]}>
        <PaywallPage accessStatus={null} auth={activeAuth} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Access active" })).toBeInTheDocument();
    expect(screen.getByText("Your access is linked to this email")).toBeInTheDocument();
    expect(screen.getByText("Active · 05/01/2026")).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage access" })).toHaveAttribute("href", expect.stringContaining("/ru/pay/manage"));
    expect(screen.getByRole("link", { name: "Contact support" })).toHaveAttribute("href", "/app/support");
    expect(screen.queryByText("Activation required")).not.toBeInTheDocument();
  });

  test("renders Russian active access copy", () => {
    renderWithI18n(
      <MemoryRouter initialEntries={["/paywall"]}>
        <PaywallPage accessStatus={null} auth={{ ...activeAuth, user: { ...activeAuth.user, locale: "ru" } }} />
      </MemoryRouter>,
      { locale: "ru" },
    );

    expect(screen.getByRole("heading", { name: "Доступ активен" })).toBeInTheDocument();
    expect(screen.getByText("Доступ привязан к этому email")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Управлять доступом" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Написать в поддержку" })).toHaveAttribute("href", "/app/support");
  });

  test("falls back to plan when expiry is missing", () => {
    renderWithI18n(
      <MemoryRouter initialEntries={["/paywall"]}>
        <PaywallPage accessStatus={{ has_access: true, access_status: "active", plan: "sub_monthly" }} auth={activeAuth} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Active · sub_monthly")).toBeInTheDocument();
  });

  test("inactive access starts app-origin checkout and redirects to landing email page", async () => {
    const user = userEvent.setup();
    const redirectTo = vi.fn();
    mockedCreateQuizSession.mockResolvedValue({ uuid: "quiz-session-1" });

    renderWithI18n(
      <MemoryRouter initialEntries={["/paywall"]}>
        <PaywallPage accessStatus={inactiveAuth.access} auth={inactiveAuth} redirectTo={redirectTo} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Activation required" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open payment" }));

    expect(mockedCreateQuizSession).toHaveBeenCalledWith({
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
    expect(redirectTo).toHaveBeenCalledWith(buildAppAccessEmailUrl("quiz-session-1", "user@example.com"));
    expect(screen.queryByRole("heading", { name: "Access active" })).not.toBeInTheDocument();
  });

  test("inactive access shows in-app legal links", () => {
    renderWithI18n(
      <MemoryRouter initialEntries={["/paywall"]}>
        <PaywallPage accessStatus={inactiveAuth.access} auth={inactiveAuth} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Terms of Use/i })).toHaveAttribute("href", "/legal/terms");
    expect(screen.getByRole("link", { name: /Privacy Policy/i })).toHaveAttribute("href", "/legal/privacy");
    expect(screen.getByRole("link", { name: /Refund Policy/i })).toHaveAttribute("href", "/legal/refund");
    expect(screen.getByText("Review the legal terms before purchase")).toBeInTheDocument();
    expect(screen.getByText("When refunds can be reviewed")).toBeInTheDocument();
  });

  test("inactive access shows error when app-origin checkout cannot start", async () => {
    const user = userEvent.setup();
    mockedCreateQuizSession.mockRejectedValue(new Error("failed"));

    renderWithI18n(
      <MemoryRouter initialEntries={["/paywall"]}>
        <PaywallPage accessStatus={inactiveAuth.access} auth={inactiveAuth} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Open payment" }));

    expect(screen.getByText("Could not open payment. Try again.")).toBeInTheDocument();
  });

  test("inactive access redeems promo code from access tab", async () => {
    const user = userEvent.setup();
    const redeemAccessCode = vi.fn(async () => ({
      ...inactiveAuth,
      access: { has_access: true, access_status: "promo_active", status_label: "Promo", plan: "promo" },
    }));
    mockedCreateAppApi.mockReturnValue({
      redeemAccessCode,
    } as ReturnType<typeof createAppApi>);
    const refresh = vi.fn(async () => ({ has_access: true, access_status: "promo_active", status_label: "Promo", plan: "promo" }));
    vi.spyOn(accessStatusHooks, "useAccessStatus").mockReturnValue({
      status: inactiveAuth.access,
      refresh,
    });

    renderWithI18n(
      <MemoryRouter initialEntries={["/paywall"]}>
        <PaywallPage accessStatus={inactiveAuth.access} auth={inactiveAuth} />
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText("For example, FG-AB12CD34"), "fg-test");
    await user.click(screen.getByRole("button", { name: "Activate code" }));

    expect(redeemAccessCode).toHaveBeenCalledWith("FG-TEST");
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByText("Promo code FG-TEST activated.")).toBeInTheDocument();
  });
});
