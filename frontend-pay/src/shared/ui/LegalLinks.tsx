import { useLocation } from "react-router-dom";
import { addClickIdToPath } from "../../entities/tracking-attribution/model";
import { useI18n } from "../../features/i18n/useI18n";
import { buildSharedSiteUrl } from "../config/runtime";
import { DEFAULT_QUIZ_LANG, isQuizLang, sharedLegalRoutes } from "../config/routes";

type LegalLinksProps = { className?: string };

export const LegalLinks = ({ className = "" }: LegalLinksProps) => {
  const { copy } = useI18n();
  const location = useLocation();
  const pathLang = location.pathname.split("/")[1];
  const lang = isQuizLang(pathLang) ? pathLang : DEFAULT_QUIZ_LANG;

  const termsPath = buildSharedSiteUrl(addClickIdToPath(sharedLegalRoutes.terms(lang), location.search));
  const refundPath = buildSharedSiteUrl(addClickIdToPath(sharedLegalRoutes.refund(lang), location.search));
  const privacyPath = buildSharedSiteUrl(addClickIdToPath(sharedLegalRoutes.privacy(lang), location.search));

  return (
    <nav className={`legal-links ${className}`.trim()} aria-label="Legal links">
      <a className="legal-links__link" href={termsPath}>{copy.footer.terms}</a>
      <span className="legal-links__dot" aria-hidden="true">•</span>
      <a className="legal-links__link" href={refundPath}>{copy.footer.refund}</a>
      <span className="legal-links__dot" aria-hidden="true">•</span>
      <a className="legal-links__link" href={privacyPath}>{copy.footer.privacy}</a>
    </nav>
  );
};
