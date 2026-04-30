import { Fragment } from "react";
import { SiteFooter } from "../../../widgets/site-footer/ui/SiteFooter";
import { SiteHeader } from "../../../widgets/site-header/ui/SiteHeader";
import { LegalLayout } from "../../../widgets/legal-layout/ui/LegalLayout";
import { type SiteLocale } from "../../../shared/config/routes";
import { siteContent, type LegalDocumentKey, type LegalSection } from "../../../shared/i18n/siteContent";

type LegalDocumentPageProps = {
  locale: SiteLocale;
  document: LegalDocumentKey;
};

export const LegalDocumentPage = ({ locale, document }: LegalDocumentPageProps) => {
  const legalDocument = siteContent[locale].legal[document];

  const renderSection = (section: LegalSection, depth = 0) => (
    <section key={`${depth}-${section.title}`} className={`legal-layout__section ${depth > 0 ? "legal-layout__section--nested" : ""}`.trim()}>
      <h2 className="legal-layout__section-title">{section.title}</h2>
      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph} className="legal-layout__section-body">
          {paragraph}
        </p>
      ))}
      {section.email ? (
        <p className="legal-layout__section-body">
          <a className="legal-layout__email" href={`mailto:${section.email}`}>{section.email}</a>
        </p>
      ) : null}
      {section.list?.length ? (
        <ul className="legal-layout__list">
          {section.list.map((item) => (
            <li key={item} className="legal-layout__list-item">{item}</li>
          ))}
        </ul>
      ) : null}
      {section.children?.map((child) => (
        <Fragment key={child.title}>{renderSection(child, depth + 1)}</Fragment>
      ))}
    </section>
  );

  return (
    <div className="site-shell">
      <SiteHeader locale={locale} />
      <main className="site-main">
        <div className="site-container">
          <LegalLayout
            title={legalDocument.title}
            updated={legalDocument.updated}
            intro={legalDocument.intro}
          >
            {legalDocument.sections.map((section) => renderSection(section))}
          </LegalLayout>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
};
