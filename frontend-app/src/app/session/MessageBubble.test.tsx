import { fireEvent, render, screen } from "@testing-library/react";

import { MessageBubble } from "./MessageBubble";

test("MessageBubble hides destructive actions until swipe is opened", () => {
  render(
    <MessageBubble
      canDelete
      message={{ id: "1", kind: "text", role: "USER_SELF", text: "Привет", authorLabel: "Я", sentAt: null }}
    />,
  );

  expect(screen.queryByRole("button", { name: "Удалить" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Отмена" })).not.toBeInTheDocument();
});

test("MessageBubble exposes only delete action in swipe-open state", () => {
  render(
    <MessageBubble
      canDelete
      message={{ id: "1", kind: "text", role: "USER_SELF", text: "Привет", authorLabel: "Я", sentAt: null }}
      swipeOpen
    />,
  );

  expect(screen.getByRole("button", { name: "Удалить" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Отмена" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Удалить" }).closest(".bubble-swipe")).toBe(
    screen.getByText("Привет").closest(".bubble-swipe"),
  );
});

test("MessageBubble does not expose delete action on long press", () => {
  render(
    <MessageBubble
      canDelete
      message={{ id: "1", kind: "text", role: "USER_SELF", text: "Привет", authorLabel: "Я", sentAt: null }}
    />,
  );

  const bubble = screen.getByText("Привет").closest("article");
  fireEvent.pointerDown(bubble!, { pointerId: 1, pointerType: "touch", clientX: 120, clientY: 140 });
  fireEvent.pointerUp(bubble!, { pointerId: 1, pointerType: "touch", clientX: 120, clientY: 140 });

  expect(screen.queryByRole("button", { name: "Удалить" })).not.toBeInTheDocument();
});

test("MessageBubble hides default self author label", () => {
  render(
    <MessageBubble
      message={{ id: "1", kind: "text", role: "USER_SELF", text: "Привет", authorLabel: "Я писал(а)", sentAt: null }}
    />,
  );

  expect(screen.queryByText("Я писал(а)")).not.toBeInTheDocument();
  expect(screen.getByText("Привет")).toBeInTheDocument();
});
