import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { renderWithI18n } from "../../test/renderWithI18n";
import { AppLayout } from "./AppLayout";

test.each([
  ["/login", false],
  ["/app", true],
  ["/app/session/abc", true],
  ["/help", true],
])("top nav visibility for %s", (route, visible) => {
  renderWithI18n(
    <MemoryRouter initialEntries={[route]}>
      <AppLayout onLogout={async () => undefined}>
        <div>content</div>
      </AppLayout>
    </MemoryRouter>,
  );

  const nav = screen.queryByRole("navigation", { name: "Flirto Guru" });
  if (visible) {
    expect(nav).toBeInTheDocument();
  } else {
    expect(nav).not.toBeInTheDocument();
  }
});

test("top nav keeps advice link pinned to app home", () => {
  renderWithI18n(
    <MemoryRouter initialEntries={["/help"]}>
      <AppLayout onLogout={async () => undefined}>
        <div>content</div>
      </AppLayout>
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "Advice" })).toHaveAttribute("href", "/app");
});

test("top nav renders legacy tab icons with labels", () => {
  renderWithI18n(
    <MemoryRouter initialEntries={["/app"]}>
      <AppLayout onLogout={async () => undefined}>
        <div>content</div>
      </AppLayout>
    </MemoryRouter>,
  );

  const adviceLink = screen.getByRole("link", { name: "Advice" });
  const profileLink = screen.getByRole("link", { name: "Profile" });

  expect(adviceLink.querySelector("svg")).not.toBeNull();
  expect(profileLink.querySelector("svg")).not.toBeNull();
});

test("top nav can render Russian labels", () => {
  renderWithI18n(
    <MemoryRouter initialEntries={["/app"]}>
      <AppLayout onLogout={async () => undefined}>
        <div>content</div>
      </AppLayout>
    </MemoryRouter>,
    { locale: "ru" },
  );

  expect(screen.getByRole("link", { name: "Совет" })).toHaveAttribute("href", "/app");
  expect(screen.getByRole("link", { name: "Профиль" })).toBeInTheDocument();
});

test("home header no longer renders app domain tagline", () => {
  renderWithI18n(
    <MemoryRouter initialEntries={["/app"]}>
      <AppLayout onLogout={async () => undefined}>
        <div>content</div>
      </AppLayout>
    </MemoryRouter>,
  );

  expect(screen.queryByText("app.flirto.guru")).not.toBeInTheDocument();
});
