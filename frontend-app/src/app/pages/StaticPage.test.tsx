import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { renderWithI18n } from "../../test/renderWithI18n";
import { StaticPage } from "./StaticPage";

test("StaticPage help explains the current app flow", () => {
  renderWithI18n(
    <MemoryRouter>
      <StaticPage kind="help" />
    </MemoryRouter>,
    { locale: "ru" },
  );

  expect(screen.getByRole("heading", { name: "Как это работает" })).toBeInTheDocument();
  expect(screen.getByText("Добавь контекст")).toBeInTheDocument();
  expect(screen.getByText("Нажми «Готово»")).toBeInTheDocument();
  expect(screen.getByText("Продолжай диалог")).toBeInTheDocument();
  expect(screen.getByText("Что ты получишь")).toBeInTheDocument();
  expect(screen.getByText("Разбор ситуации")).toBeInTheDocument();
  expect(screen.getByText("План действий")).toBeInTheDocument();
  expect(screen.getByText("Текст сообщения")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Написать в поддержку" })).toHaveAttribute("href", "/app/support");
  expect(screen.queryByRole("button", { name: "Показать обучение заново" })).not.toBeInTheDocument();

  expect(screen.queryByText("Режимы")).not.toBeInTheDocument();
  expect(screen.queryByText("Готовый ответ")).not.toBeInTheDocument();
  expect(screen.queryByText("Разбор и план")).not.toBeInTheDocument();
});
