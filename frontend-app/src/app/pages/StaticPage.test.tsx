import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { StaticPage } from "./StaticPage";

test("StaticPage help explains the current app flow", () => {
  render(
    <MemoryRouter>
      <StaticPage kind="help" />
    </MemoryRouter>,
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

  expect(screen.queryByText("Режимы")).not.toBeInTheDocument();
  expect(screen.queryByText("Готовый ответ")).not.toBeInTheDocument();
  expect(screen.queryByText("Разбор и план")).not.toBeInTheDocument();
});
