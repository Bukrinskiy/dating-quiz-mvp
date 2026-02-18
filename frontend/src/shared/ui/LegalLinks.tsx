import { Link, useLocation } from "react-router-dom";
import { addClickIdToPath } from "../lib/clickid";
import { useI18n } from "../../features/i18n/I18nProvider";

export const LegalLinks = () => {
  const { copy } = useI18n();
  const location = useLocation();

  return (
    <>
      <Link to={addClickIdToPath("/terms.html", location.search)}>{copy.footer.terms}</Link>
      <span aria-hidden="true">•</span>
      <Link to={addClickIdToPath("/refund-policy.html", location.search)}>{copy.footer.refund}</Link>
      <span aria-hidden="true">•</span>
      <Link to={addClickIdToPath("/privacy-policy.html", location.search)}>{copy.footer.privacy}</Link>
    </>
  );
};
