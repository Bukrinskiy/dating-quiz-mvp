import { siteContent, type LegalDocumentKey } from "../i18n/siteContent";

export const siteLocales = ["en", "ru"] as const;
export type SiteLocale = (typeof siteLocales)[number];

export const isSiteLocale = (value: string | undefined): value is SiteLocale =>
  value !== undefined && siteLocales.includes(value as SiteLocale);

const legalDocumentMap = {
  "terms.html": "terms",
  "privacy-policy.html": "privacy",
  "refund-policy.html": "refund",
} as const satisfies Record<string, LegalDocumentKey>;

export const getLegalDocument = (value: string | undefined): LegalDocumentKey | null => {
  if (!value) {
    return null;
  }
  return legalDocumentMap[value as keyof typeof legalDocumentMap] ?? null;
};

export const siteRoutes = {
  home: (locale: SiteLocale) => `/${locale}`,
  legal: (locale: SiteLocale, document: LegalDocumentKey) => {
    const slug = Object.entries(legalDocumentMap).find(([, key]) => key === document)?.[0];
    return slug ? `/${locale}/${slug}` : `/${locale}`;
  },
  primaryNav: (locale: SiteLocale) => [
    { href: `#about-${locale}`, label: siteContent[locale].navigation.about },
    { href: `#reviews-${locale}`, label: siteContent[locale].navigation.reviews },
  ],
};
