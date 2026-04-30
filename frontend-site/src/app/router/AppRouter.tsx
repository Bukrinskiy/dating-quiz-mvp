import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { HomePage } from "../../pages/home/ui/HomePage";
import { LegalDocumentPage } from "../../pages/legal/ui/LegalDocumentPage";
import { NotFoundPage } from "../../pages/not-found/ui/NotFoundPage";
import { getLegalDocument, isSiteLocale, type SiteLocale, siteRoutes } from "../../shared/config/routes";

const DEFAULT_LOCALE: SiteLocale = "en";

const RedirectWithSearch = ({ to }: { to: string }) => {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
};

const HomePageRoute = () => {
  const { lang } = useParams<{ lang?: string }>();
  if (!isSiteLocale(lang) || lang !== DEFAULT_LOCALE) {
    return <RedirectWithSearch to={siteRoutes.home(DEFAULT_LOCALE)} />;
  }

  return <HomePage locale={DEFAULT_LOCALE} />;
};

const LegalPageRoute = () => {
  const { lang, document } = useParams<{ lang?: string; document?: string }>();
  if (!isSiteLocale(lang)) {
    return <RedirectWithSearch to={siteRoutes.home(DEFAULT_LOCALE)} />;
  }

  const legalDocument = getLegalDocument(document);
  if (!legalDocument) {
    return <NotFoundPage locale={DEFAULT_LOCALE} />;
  }

  if (lang !== DEFAULT_LOCALE) {
    return <RedirectWithSearch to={siteRoutes.legal(DEFAULT_LOCALE, legalDocument)} />;
  }

  return <LegalDocumentPage locale={DEFAULT_LOCALE} document={legalDocument} />;
};

export const AppRouter = () => (
  <Routes>
    <Route path="/" element={<RedirectWithSearch to={siteRoutes.home(DEFAULT_LOCALE)} />} />
    <Route path="/:lang" element={<HomePageRoute />} />
    <Route path="/:lang/:document" element={<LegalPageRoute />} />
    <Route path="*" element={<NotFoundPage locale={DEFAULT_LOCALE} />} />
  </Routes>
);
