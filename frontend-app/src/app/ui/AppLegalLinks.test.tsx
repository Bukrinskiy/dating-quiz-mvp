import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { renderWithI18n } from "../../test/renderWithI18n";
import { AppLegalLinks } from "./AppLegalLinks";

test("AppLegalLinks renders list rows with subtitles and routes", () => {
  renderWithI18n(
    <MemoryRouter>
      <AppLegalLinks />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: /Terms of Use/i })).toHaveAttribute("href", "/legal/terms");
  expect(screen.getByRole("link", { name: /Privacy Policy/i })).toHaveAttribute("href", "/legal/privacy");
  expect(screen.getByRole("link", { name: /Refund Policy/i })).toHaveAttribute("href", "/legal/refund");

  expect(screen.getByText("Service rules and user responsibilities")).toBeInTheDocument();
  expect(screen.getByText("What data we collect and how we use it")).toBeInTheDocument();
  expect(screen.getByText("When refunds can be reviewed")).toBeInTheDocument();
});
