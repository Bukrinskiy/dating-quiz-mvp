import type { AppMessages, RoleLabels } from "../i18n";
import type { SessionMessage } from "../types";

export function getVisibleAuthorLabel(message: SessionMessage, roleLabels: RoleLabels): string | null {
  const authorLabel = message.authorLabel?.trim() || null;

  if (message.role === "USER_SELF" && authorLabel === roleLabels.USER_SELF) {
    return null;
  }

  return authorLabel;
}

export function getConfirmAuthorLabel(message: SessionMessage, messages: AppMessages, roleLabels: RoleLabels): string {
  const visibleAuthorLabel = getVisibleAuthorLabel(message, roleLabels);

  if (visibleAuthorLabel) {
    return visibleAuthorLabel;
  }
  if (message.role === "USER_PEER") {
    return messages.session.userPeerShort;
  }
  return messages.session.userSelfShort;
}
