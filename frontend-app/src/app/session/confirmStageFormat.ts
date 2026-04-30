import type { SessionMessage } from "../types";
import { getConfirmAuthorLabel } from "./messageAuthor";

export type ConfirmSummaryItem = {
  id: string;
  text: string;
};

export type ConfirmTimelineItem = {
  id: string;
  author: string;
  kindLabel: string;
  text: string;
  sentAt: string | null;
};

const SERVICE_TAG_RE = /^(?:\[[^\]]+\]\s*)+/;

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

export const stripServiceTags = (value: string): string => value.replace(SERVICE_TAG_RE, "").replace(/^[:\s-]+/, "").trim();

export function buildConfirmSummaryItems(preview: string): ConfirmSummaryItem[] {
  const seen = new Set<string>();

  return preview
    .split(/\n+|\\n+/)
    .map((line) => collapseWhitespace(stripServiceTags(line)))
    .filter(Boolean)
    .filter((line) => {
      if (seen.has(line)) {
        return false;
      }
      seen.add(line);
      return true;
    })
    .map((text, index) => ({ id: `summary-${index}`, text }));
}

function resolveKindLabel(message: SessionMessage): string {
  if (message.kind === "image") {
    return "Скриншот";
  }
  if (message.kind === "audio") {
    return "Голосовое";
  }
  return "Сообщение";
}

export function buildConfirmTimelineItems(messages: SessionMessage[]): ConfirmTimelineItem[] {
  return messages
    .filter((message) => message.kind !== "system")
    .map((message) => ({
      id: message.id,
      author: getConfirmAuthorLabel(message),
      kindLabel: resolveKindLabel(message),
      text: stripServiceTags(message.text || ""),
      sentAt: message.sentAt || null,
    }))
    .filter((message) => message.text);
}
