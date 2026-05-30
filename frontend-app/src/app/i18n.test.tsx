import { render, screen } from "@testing-library/react";

import { I18nProvider, normalizeAppLocale, useI18n } from "./i18n";

function Probe() {
  const { messages } = useI18n();
  return <span>{messages.profile.language}</span>;
}

test("app locale defaults to English for unknown values", () => {
  expect(normalizeAppLocale(undefined)).toBe("en");
  expect(normalizeAppLocale("de")).toBe("en");
});

test("app locale normalizes Russian locale variants", () => {
  expect(normalizeAppLocale("ru")).toBe("ru");
  expect(normalizeAppLocale("ru-RU")).toBe("ru");
});

test("app locale normalizes French and Spanish locale variants", () => {
  expect(normalizeAppLocale("fr")).toBe("fr");
  expect(normalizeAppLocale("fr-FR")).toBe("fr");
  expect(normalizeAppLocale("es")).toBe("es");
  expect(normalizeAppLocale("es-ES")).toBe("es");
});

test("i18n provider updates messages when locale changes", () => {
  const { rerender } = render(
    <I18nProvider locale="en">
      <Probe />
    </I18nProvider>,
  );

  expect(screen.getByText("Language")).toBeInTheDocument();

  rerender(
    <I18nProvider locale="ru">
      <Probe />
    </I18nProvider>,
  );

  expect(screen.getByText("Язык")).toBeInTheDocument();
});
