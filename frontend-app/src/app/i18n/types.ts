import type { messages as enMessages, modeMessages as enModeMessages, roleLabels as enRoleLabels } from "./messages/en";

export type AppLocale = "en" | "ru" | "fr" | "es";
export type AppMessages = typeof enMessages;
export type RoleLabels = typeof enRoleLabels;
export type ModeMessages = typeof enModeMessages;
