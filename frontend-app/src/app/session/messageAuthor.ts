import { roleLabels } from "../copy";
import type { SessionMessage } from "../types";

export function getVisibleAuthorLabel(message: SessionMessage): string | null {
  const authorLabel = message.authorLabel?.trim() || null;

  if (message.role === "USER_SELF" && authorLabel === roleLabels.USER_SELF) {
    return null;
  }

  return authorLabel;
}

export function getConfirmAuthorLabel(message: SessionMessage): string {
  const visibleAuthorLabel = getVisibleAuthorLabel(message);

  if (visibleAuthorLabel) {
    return visibleAuthorLabel;
  }
  if (message.role === "USER_PEER") {
    return "Собеседник";
  }
  return "Я";
}
