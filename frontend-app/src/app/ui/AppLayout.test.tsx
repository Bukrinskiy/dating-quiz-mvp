import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { AppLayout } from "./AppLayout";

test.each([
  ["/login", false],
  ["/app", true],
  ["/app/session/abc", true],
  ["/help", true],
])("top nav visibility for %s", (route, visible) => {
  render(
    <MemoryRouter initialEntries={[route]}>
      <AppLayout onLogout={async () => undefined}>
        <div>content</div>
      </AppLayout>
    </MemoryRouter>,
  );

  const nav = screen.queryByRole("navigation", { name: "Основная навигация" });
  if (visible) {
    expect(nav).toBeInTheDocument();
  } else {
    expect(nav).not.toBeInTheDocument();
  }
});

test("top nav keeps advice link pinned to app home", () => {
  render(
    <MemoryRouter initialEntries={["/help"]}>
      <AppLayout onLogout={async () => undefined}>
        <div>content</div>
      </AppLayout>
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "Совет" })).toHaveAttribute("href", "/app");
});

test("top nav renders legacy tab icons with labels", () => {
  render(
    <MemoryRouter initialEntries={["/app"]}>
      <AppLayout onLogout={async () => undefined}>
        <div>content</div>
      </AppLayout>
    </MemoryRouter>,
  );

  const adviceLink = screen.getByRole("link", { name: "Совет" });
  const profileLink = screen.getByRole("link", { name: "Профиль" });

  expect(adviceLink.querySelector("svg")).not.toBeNull();
  expect(profileLink.querySelector("svg")).not.toBeNull();
});

test("home header no longer renders app domain tagline", () => {
  render(
    <MemoryRouter initialEntries={["/app"]}>
      <AppLayout onLogout={async () => undefined}>
        <div>content</div>
      </AppLayout>
    </MemoryRouter>,
  );

  expect(screen.queryByText("app.flirto.guru")).not.toBeInTheDocument();
});
