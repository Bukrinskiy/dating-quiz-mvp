import { describe, expect, test } from "vitest";

import { messages as ruMessages, roleLabels as ruRoleLabels } from "../i18n/messages/ru";
import type { SessionMessage } from "../types";
import { buildConfirmSummaryItems, buildConfirmTimelineItems, stripServiceTags } from "./confirmStageFormat";

describe("confirmStageFormat", () => {
  test("stripServiceTags removes service prefixes", () => {
    expect(stripServiceTags("[text][edit]   Уточнение пользователя")).toBe("Уточнение пользователя");
    expect(stripServiceTags("[ИЗОБРАЖЕНИЕ] Фрагмент переписки")).toBe("Фрагмент переписки");
    expect(stripServiceTags("[ГОЛОСОВОЕ]: Голосом объяснил")).toBe("Голосом объяснил");
  });

  test("buildConfirmSummaryItems removes empty lines and duplicates", () => {
    expect(buildConfirmSummaryItems("[text] тест\n\n[text] тест\n[edit] уточнение")).toEqual([
      { id: "summary-0", text: "тест" },
      { id: "summary-1", text: "уточнение" },
    ]);
  });

  test("buildConfirmTimelineItems converts mixed messages into human-readable items", () => {
    const messages: SessionMessage[] = [
      { id: "1", kind: "text", role: "USER_SELF", authorLabel: "Я писал(а)", text: "[text] Привет" },
      { id: "2", kind: "image", role: "USER_PEER", authorLabel: "Аня", sentAt: "2026-04-20T09:30:00.000Z", text: "[ИЗОБРАЖЕНИЕ] Скрин диалога" },
      { id: "3", kind: "audio", role: "USER_PEER", text: "[ГОЛОСОВОЕ] Голосом объяснил" },
      { id: "4", kind: "system", text: "Контекст собран." },
    ];

    expect(buildConfirmTimelineItems(messages, ruMessages, ruRoleLabels)).toEqual([
      { id: "1", author: "Я", kindLabel: "Сообщение", text: "Привет", sentAt: null },
      { id: "2", author: "Аня", kindLabel: "Скриншот", text: "Скрин диалога", sentAt: "2026-04-20T09:30:00.000Z" },
      { id: "3", author: "Собеседник", kindLabel: "Голосовое", text: "Голосом объяснил", sentAt: null },
    ]);
  });
});
