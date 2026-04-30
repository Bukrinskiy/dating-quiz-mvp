export const QUIZ_PREFIX = "/quiz";
export const QUIZ_LANGS = ["ru", "en"] as const;
export type QuizLang = (typeof QUIZ_LANGS)[number];
export const DEFAULT_QUIZ_LANG: QuizLang = "en";

const join = (prefix: string, path = ""): string => {
  if (!path || path === "/") {
    return prefix;
  }

  return `${prefix}${path.startsWith("/") ? path : `/${path}`}`;
};

const withLangPrefix = (lang: QuizLang): string => `/${lang}${QUIZ_PREFIX}`;

export const quizRoutes = {
  root: (lang: QuizLang = DEFAULT_QUIZ_LANG) => withLangPrefix(lang),
  step: (lang: QuizLang, step: number | string) => join(withLangPrefix(lang), `/${step}`),
  email: (lang: QuizLang, uuid: string) => join(withLangPrefix(lang), `/email/${uuid}`),
  terms: (lang: QuizLang = DEFAULT_QUIZ_LANG) => `/${lang}/terms.html`,
  privacy: (lang: QuizLang = DEFAULT_QUIZ_LANG) => `/${lang}/privacy-policy.html`,
  refund: (lang: QuizLang = DEFAULT_QUIZ_LANG) => `/${lang}/refund-policy.html`,
};

export const isQuizLang = (value: string | undefined): value is QuizLang =>
  value === "ru" || value === "en";

export const canonicalQuizLang = (value: string | undefined): QuizLang => (value === "en" ? "en" : DEFAULT_QUIZ_LANG);
