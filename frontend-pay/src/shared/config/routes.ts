export const QUIZ_LANGS = ["ru", "en"] as const;
export type QuizLang = (typeof QUIZ_LANGS)[number];
export const DEFAULT_QUIZ_LANG: QuizLang = "en";

const join = (prefix: string, path = ""): string => {
  if (!path || path === "/") {
    return prefix;
  }

  return `${prefix}${path.startsWith("/") ? path : `/${path}`}`;
};

const withLangPrefix = (lang: QuizLang): string => `/${lang}`;

export const payRoutes = {
  checkout: (lang: QuizLang, uuid: string) => join(withLangPrefix(lang), `/checkout/${uuid}`),
  success: (lang: QuizLang = DEFAULT_QUIZ_LANG) => join(withLangPrefix(lang), "/pay/success"),
  cancel: (lang: QuizLang = DEFAULT_QUIZ_LANG) => join(withLangPrefix(lang), "/pay/cancel"),
  manage: (lang: QuizLang = DEFAULT_QUIZ_LANG) => join(withLangPrefix(lang), "/pay/manage"),
  legacyCheckout: (lang: QuizLang, uuid: string) => join(withLangPrefix(lang), `/quiz/checkout/${uuid}`),
};

export const sharedLegalRoutes = {
  terms: (lang: QuizLang = DEFAULT_QUIZ_LANG) => `/${lang}/terms.html`,
  privacy: (lang: QuizLang = DEFAULT_QUIZ_LANG) => `/${lang}/privacy-policy.html`,
  refund: (lang: QuizLang = DEFAULT_QUIZ_LANG) => `/${lang}/refund-policy.html`,
};

export const isQuizLang = (value: string | undefined): value is QuizLang =>
  value === "ru" || value === "en";

export const canonicalQuizLang = (value: string | undefined): QuizLang => (value === "en" ? "en" : DEFAULT_QUIZ_LANG);
