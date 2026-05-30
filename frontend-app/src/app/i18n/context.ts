import { createContext } from "react";

import { DEFAULT_LOCALE } from "./locale";
import { messagesByLocale, modeMessagesByLocale, roleLabelsByLocale } from "./messages";
import type { AppLocale, AppMessages, ModeMessages, RoleLabels } from "./types";

export type I18nContextValue = {
  locale: AppLocale;
  messages: AppMessages;
  modeMessages: ModeMessages;
  roleLabels: RoleLabels;
};

export const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  messages: messagesByLocale[DEFAULT_LOCALE],
  modeMessages: modeMessagesByLocale[DEFAULT_LOCALE],
  roleLabels: roleLabelsByLocale[DEFAULT_LOCALE],
});
