import { LegalLayout } from "../components/legal/LegalLayout";
import { LegalSection } from "../components/legal/LegalSection";
import type { LegalDocument } from "../features/i18n/messages";
import { SiteFooter } from "../shared/ui/SiteFooter";

type LegalPageProps = {
  document: LegalDocument;
};

export const LegalPage = ({ document }: LegalPageProps) => {
  return (
    <>
      <LegalLayout title={document.title} updated={document.updated} intro={document.intro}>
        {document.sections.map((section, index) => (
          <LegalSection key={`${section.title}-${index}`} section={section} path={`legal-section-${index}`} />
        ))}
      </LegalLayout>
      <SiteFooter />
    </>
  );
};
