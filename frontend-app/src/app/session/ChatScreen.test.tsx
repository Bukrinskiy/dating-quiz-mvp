import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { ChatScreen } from "./ChatScreen";

test("ChatScreen renders empty collect state", () => {
  render(
    <ChatScreen
      busy={false}
      deletingMessageId={null}
      generated={null}
      generating={false}
      hasAssets={false}
      messages={[]}
      meta={{ role: "USER_SELF", display_name: "", sent_at: "" }}
      onAudioDenied={vi.fn()}
      onCloseBatch={vi.fn(async () => undefined)}
      onDeleteMessage={vi.fn(async () => true)}
      onOpenRoleMeta={vi.fn()}
      onSendAudio={vi.fn(async () => undefined)}
      onSendImage={vi.fn(async () => undefined)}
      onSendText={vi.fn(async () => undefined)}
    />,
  );

  expect(screen.getByText("Добавь контекст")).toBeInTheDocument();
  expect(screen.getByText("Текст, скриншот переписки или голосовое")).toBeInTheDocument();
});

test("ChatScreen batch bar no longer renders plus more action", () => {
  render(
    <ChatScreen
      busy={false}
      deletingMessageId={null}
      generated={null}
      generating={false}
      hasAssets
      messages={[
        { id: "1", kind: "text", role: "USER_SELF", text: "Привет", pending: false, authorLabel: "Я", sentAt: null },
      ]}
      meta={{ role: "USER_SELF", display_name: "", sent_at: "" }}
      onAudioDenied={vi.fn()}
      onCloseBatch={vi.fn(async () => undefined)}
      onDeleteMessage={vi.fn(async () => true)}
      onOpenRoleMeta={vi.fn()}
      onSendAudio={vi.fn(async () => undefined)}
      onSendImage={vi.fn(async () => undefined)}
      onSendText={vi.fn(async () => undefined)}
    />,
  );

  expect(screen.queryByText("+ Ещё")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Готово" })).toBeInTheDocument();
});

async function swipeBubble(element: Element, fromX: number, toX: number) {
  const user = userEvent.setup();
  await user.pointer([
    { target: element, coords: { x: fromX, y: 140 }, keys: "[TouchA>]" },
    { target: element, coords: { x: toX, y: 140 } },
    { target: element, coords: { x: toX, y: 140 }, keys: "[/TouchA]" },
  ]);
}

test("ChatScreen ignores long press and closes swipe delete on outside click", async () => {
  const { container } = render(
    <ChatScreen
      busy={false}
      deletingMessageId={null}
      generated={null}
      generating={false}
      hasAssets
      messages={[
        { id: "1", kind: "text", role: "USER_SELF", text: "Привет", pending: false, authorLabel: "Я", sentAt: null },
      ]}
      meta={{ role: "USER_SELF", display_name: "", sent_at: "" }}
      onAudioDenied={vi.fn()}
      onCloseBatch={vi.fn(async () => undefined)}
      onDeleteMessage={vi.fn(async () => true)}
      onOpenRoleMeta={vi.fn()}
      onSendAudio={vi.fn(async () => undefined)}
      onSendImage={vi.fn(async () => undefined)}
      onSendText={vi.fn(async () => undefined)}
    />,
  );

  const bubble = screen.getByText("Привет").closest("article");
  fireEvent.pointerDown(bubble!, {
    pointerId: 1,
    pointerType: "touch",
    buttons: 1,
    clientX: 120,
    clientY: 140,
  });
  fireEvent.pointerUp(bubble!, { pointerId: 1, pointerType: "touch", clientX: 120, clientY: 140 });

  expect(screen.queryByRole("heading", { name: "Действия с фрагментом" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Удалить" })).not.toBeInTheDocument();

  await swipeBubble(bubble!, 120, 20);
  expect(screen.getByRole("button", { name: "Удалить" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Удалить" }).closest(".bubble-swipe")).toBe(
    screen.getByText("Привет").closest(".bubble-swipe"),
  );
  fireEvent.click(container.querySelector(".chat-scroll")!);
  expect(screen.queryByRole("button", { name: "Удалить" })).not.toBeInTheDocument();
});

test("ChatScreen renders result bubble with expandable text", async () => {
  const user = userEvent.setup();

  render(
    <ChatScreen
      busy={false}
      deletingMessageId={null}
      generated={null}
      generating={false}
      hasAssets
      messages={[
        { id: "1", kind: "text", role: "USER_SELF", text: "Привет", pending: false, authorLabel: "Я", sentAt: null },
        {
          id: "ai-1",
          kind: "assistant",
          role: null,
          text: "Первая строка\nВторая строка\nТретья строка\nЧетвертая строка",
          pending: false,
          authorLabel: "Flirto Guru",
          sentAt: null,
          uiPayload: {
            diagnosis: "Диагноз",
            core_leverage: "Точка рычага",
            plan_24h: ["Пункт 1"],
            message_template: "Первая строка\nВторая строка\nТретья строка\nЧетвертая строка",
            avoid_list: ["Не дави"],
          },
        },
      ]}
      meta={{ role: "USER_SELF", display_name: "", sent_at: "" }}
      onAudioDenied={vi.fn()}
      onCloseBatch={vi.fn(async () => undefined)}
      onDeleteMessage={vi.fn(async () => true)}
      onOpenRoleMeta={vi.fn()}
      onSendAudio={vi.fn(async () => undefined)}
      onSendImage={vi.fn(async () => undefined)}
      onSendText={vi.fn(async () => undefined)}
    />,
  );

  expect(screen.getByText("Показать больше")).toBeInTheDocument();
  expect(screen.queryByText("Мягче")).not.toBeInTheDocument();
  expect(screen.queryByText("Своими словами")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Диагноз" }));
  expect(screen.getByRole("heading", { name: "Диагноз" })).toBeInTheDocument();
});

test("ChatScreen deletes assistant result from right-swipe inline action", async () => {
  const onDeleteMessage = vi.fn(async () => true);

  render(
    <ChatScreen
      busy={false}
      deletingMessageId={null}
      generated={null}
      generating={false}
      hasAssets
      messages={[
        {
          id: "ai-1",
          kind: "assistant",
          role: null,
          text: "Готовый ответ ассистента",
          pending: false,
          authorLabel: "Flirto Guru",
          sentAt: null,
          uiPayload: {
            diagnosis: "Диагноз",
            core_leverage: "Точка рычага",
            plan_24h: ["Пункт 1"],
            message_template: "Готовый ответ ассистента",
            avoid_list: ["Не дави"],
          },
        },
      ]}
      meta={{ role: "USER_SELF", display_name: "", sent_at: "" }}
      onAudioDenied={vi.fn()}
      onCloseBatch={vi.fn(async () => undefined)}
      onDeleteMessage={onDeleteMessage}
      onOpenRoleMeta={vi.fn()}
      onSendAudio={vi.fn(async () => undefined)}
      onSendImage={vi.fn(async () => undefined)}
      onSendText={vi.fn(async () => undefined)}
    />,
  );

  const bubble = screen.getByText("Готовый ответ ассистента").closest("article");
  fireEvent.pointerDown(bubble!, {
    pointerId: 1,
    pointerType: "touch",
    buttons: 1,
    clientX: 120,
    clientY: 140,
  });
  fireEvent.pointerUp(bubble!, { pointerId: 1, pointerType: "touch", clientX: 120, clientY: 140 });
  expect(screen.queryByRole("button", { name: "Удалить" })).not.toBeInTheDocument();

  await swipeBubble(bubble!, 120, 220);
  const deleteAction = screen.getByRole("button", { name: "Удалить" });
  const swipeSurface = screen.getByText("Готовый ответ ассистента").closest(".bubble-swipe");
  expect(deleteAction.closest(".bubble-swipe")).toBe(swipeSurface);
  expect(swipeSurface).not.toContainElement(screen.getByText("Готовый разбор"));

  await act(async () => {
    fireEvent.click(deleteAction);
  });
  expect(onDeleteMessage).toHaveBeenCalledWith("ai-1");
});
