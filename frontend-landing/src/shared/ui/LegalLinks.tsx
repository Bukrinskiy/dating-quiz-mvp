import { Link, useLocation } from "react-router-dom";
import { addClickIdToPath } from "../../entities/tracking-attribution/model";
import { useI18n } from "../../features/i18n/useI18n";
import { DEFAULT_QUIZ_LANG, isQuizLang } from "../config/routes";

type LegalLinksProps = {
  basePath?: string;
  className?: string;
};

export const LegalLinks = ({ basePath, className = "" }: LegalLinksProps) => {
  const { copy } = useI18n();
  const location = useLocation();
  const pathLang = location.pathname.split("/")[1];
  const resolvedBasePath = basePath || `/${isQuizLang(pathLang) ? pathLang : DEFAULT_QUIZ_LANG}`;

  const termsPath = `${resolvedBasePath}/terms.html`;
  const refundPath = `${resolvedBasePath}/refund-policy.html`;
  const privacyPath = `${resolvedBasePath}/privacy-policy.html`;

  return (
    <nav className={`legal-links ${className}`.trim()} aria-label="Legal links">
      <Link className="legal-links__link" to={addClickIdToPath(termsPath, location.search)}>{copy.footer.terms}</Link>
      <span className="legal-links__dot" aria-hidden="true">•</span>
      <Link className="legal-links__link" to={addClickIdToPath(refundPath, location.search)}>{copy.footer.refund}</Link>
      <span className="legal-links__dot" aria-hidden="true">•</span>
      <Link className="legal-links__link" to={addClickIdToPath(privacyPath, location.search)}>{copy.footer.privacy}</Link>
    </nav>
  );
};
