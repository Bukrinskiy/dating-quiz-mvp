import { Fragment } from "react";

import { legalDocuments, type LegalDocumentKey, type LegalSection } from "../../../../shared/legal/documents";

type AppLegalDocumentPageProps = {
  document: LegalDocumentKey;
};

export function AppLegalDocumentPage({ document }: AppLegalDocumentPageProps) {
  const legalDocument = legalDocuments[document];

  return (
    <section className="stack-page">
      <div className="page-heading">
        <h1>{legalDocument.title}</h1>
        <p>{legalDocument.updated}</p>
        {legalDocument.intro ? <p>{legalDocument.intro}</p> : null}
      </div>

      <div className="legal-card">
        {legalDocument.sections.map((section) => (
          <Fragment key={section.title}>{renderSection(section)}</Fragment>
        ))}
      </div>
    </section>
  );
}

function renderSection(section: LegalSection, depth = 0) {
  return (
    <section className={`legal-card__section${depth > 0 ? " legal-card__section--nested" : ""}`} key={`${depth}-${section.title}`}>
      <h2 className="legal-card__title">{section.title}</h2>
      {section.paragraphs?.map((paragraph) => (
        <p className="legal-card__body" key={paragraph}>
          {paragraph}
        </p>
      ))}
      {section.email ? (
        <p className="legal-card__body">
          <a className="legal-card__email" href={`mailto:${section.email}`}>
            {section.email}
          </a>
        </p>
      ) : null}
      {section.list?.length ? (
        <ul className="legal-card__list">
          {section.list.map((item) => (
            <li className="legal-card__item" key={item}>
              {item}
            </li>
          ))}
        </ul>
      ) : null}
      {section.children?.map((child) => (
        <Fragment key={child.title}>{renderSection(child, depth + 1)}</Fragment>
      ))}
    </section>
  );
}
