import type { LegalSection as LegalSectionType } from "../../features/i18n/messages";
import { LegalList } from "./LegalList";

type LegalSectionProps = {
  section: LegalSectionType;
  path: string;
};

export const LegalSection = ({ section, path }: LegalSectionProps) => {
  const sectionId = `${path}-${section.title.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}`;

  return (
    <section className="legal-section" aria-labelledby={sectionId}>
      <h2 id={sectionId}>{section.title}</h2>
      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph} className="legal-text">
          {paragraph}
        </p>
      ))}
      {section.email ? (
        <a className="legal-email" href={`mailto:${section.email}`}>
          {section.email}
        </a>
      ) : null}
      {section.list ? <LegalList items={section.list} /> : null}
      {section.children?.map((child, index) => (
        <LegalSection key={`${child.title}-${index}`} section={child} path={`${sectionId}-${index}`} />
      ))}
    </section>
  );
};
