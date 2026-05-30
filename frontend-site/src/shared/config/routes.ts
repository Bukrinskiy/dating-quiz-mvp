import { LEGAL_DOCUMENT_SLUGS, getLegalDocumentBySlug, type LegalDocumentKey } from "../../../../shared/legal/documents";
import { siteContent } from "../i18n/siteContent";

export const siteLocales = ["en", "ru"] as const;
export type SiteLocale = (typeof siteLocales)[number];

export const isSiteLocale = (value: string | undefined): value is SiteLocale =>
  value !== undefined && siteLocales.includes(value as SiteLocale);

export const getLegalDocument = (value: string | undefined): LegalDocumentKey | null => {
  return getLegalDocumentBySlug(value);
};

export const siteRoutes = {
  home: (locale: SiteLocale) => `/${locale}`,
  legal: (locale: SiteLocale, document: LegalDocumentKey) => {
    const slug = LEGAL_DOCUMENT_SLUGS[document];
    return slug ? `/${locale}/${slug}` : `/${locale}`;
  },
  primaryNav: (locale: SiteLocale) => [
    { href: `#about-${locale}`, label: siteContent[locale].navigation.about },
    { href: `#reviews-${locale}`, label: siteContent[locale].navigation.reviews },
  ],
};
