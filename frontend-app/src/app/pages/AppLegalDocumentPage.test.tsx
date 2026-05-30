import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { renderWithI18n } from "../../test/renderWithI18n";
import { AppLegalDocumentPage } from "./AppLegalDocumentPage";

test("AppLegalDocumentPage renders shared terms content", () => {
  renderWithI18n(
    <MemoryRouter>
      <AppLegalDocumentPage document="terms" />
    </MemoryRouter>,
  );

  expect(screen.getByRole("heading", { name: "Terms of Use" })).toBeInTheDocument();
  expect(screen.getByText("1. Service Description")).toBeInTheDocument();
  expect(screen.getByText(/Flirto is an AI-powered dating communication assistant/i)).toBeInTheDocument();
  expect(screen.queryByText(/Telegram bot/i)).not.toBeInTheDocument();
});

test("AppLegalDocumentPage uses canonical English legal content for non-English app locale", () => {
  renderWithI18n(
    <MemoryRouter>
      <AppLegalDocumentPage document="refund" />
    </MemoryRouter>,
    { locale: "ru" },
  );

  expect(screen.getByRole("heading", { name: "Refund Policy" })).toBeInTheDocument();
  expect(screen.getByText(/the account email used for access/i)).toBeInTheDocument();
});
