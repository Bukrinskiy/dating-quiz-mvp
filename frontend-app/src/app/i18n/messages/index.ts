import type { AppLocale, AppMessages, ModeMessages, RoleLabels } from "../types";
import { messages as enMessages, modeMessages as enModeMessages, roleLabels as enRoleLabels } from "./en";
import { messages as esMessages, modeMessages as esModeMessages, roleLabels as esRoleLabels } from "./es";
import { messages as frMessages, modeMessages as frModeMessages, roleLabels as frRoleLabels } from "./fr";
import { messages as ruMessages, modeMessages as ruModeMessages, roleLabels as ruRoleLabels } from "./ru";

const _ruMessagesTypeCheck: AppMessages = ruMessages;
const _ruModeTypeCheck: ModeMessages = ruModeMessages;
const _ruRoleTypeCheck: RoleLabels = ruRoleLabels;
const _frMessagesTypeCheck: AppMessages = frMessages;
const _frModeTypeCheck: ModeMessages = frModeMessages;
const _frRoleTypeCheck: RoleLabels = frRoleLabels;
const _esMessagesTypeCheck: AppMessages = esMessages;
const _esModeTypeCheck: ModeMessages = esModeMessages;
const _esRoleTypeCheck: RoleLabels = esRoleLabels;

void _ruMessagesTypeCheck;
void _ruModeTypeCheck;
void _ruRoleTypeCheck;
void _frMessagesTypeCheck;
void _frModeTypeCheck;
void _frRoleTypeCheck;
void _esMessagesTypeCheck;
void _esModeTypeCheck;
void _esRoleTypeCheck;

export const messagesByLocale: Record<AppLocale, AppMessages> = {
  en: enMessages,
  ru: ruMessages,
  fr: frMessages,
  es: esMessages,
};

export const roleLabelsByLocale: Record<AppLocale, RoleLabels> = {
  en: enRoleLabels,
  ru: ruRoleLabels,
  fr: frRoleLabels,
  es: esRoleLabels,
};

export const modeMessagesByLocale: Record<AppLocale, ModeMessages> = {
  en: enModeMessages,
  ru: ruModeMessages,
  fr: frModeMessages,
  es: esModeMessages,
};
