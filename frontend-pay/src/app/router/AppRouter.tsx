import { useEffect, useMemo, useRef } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { useI18n } from "../../features/i18n/useI18n";
import { CheckoutPage } from "../../pages/checkout/CheckoutPage";
import { CancelPage } from "../../pages/cancel/CancelPage";
import { ManagePage } from "../../pages/manage/ManagePage";
import { PayNotFoundPage } from "../../pages/not-found/PayNotFoundPage";
import { SuccessPage } from "../../pages/success/SuccessPage";
import { propagateClickIdToLinks } from "../../entities/tracking-attribution/model";
import { DEFAULT_QUIZ_LANG, canonicalQuizLang, isQuizLang, payRoutes } from "../../shared/config/routes";
import { logTracking } from "../../shared/lib/trackingLogger";
import { hitYandexMetrikaPage } from "../../shared/lib/yandexMetrika";

const RedirectWithSearch = ({ to }: { to: string }) => {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
};

const LocalizedPayEntryPage = () => {
  const { lang } = useParams<{ lang?: string }>();
  if (!isQuizLang(lang)) {
    return <RedirectWithSearch to={payRoutes.manage(DEFAULT_QUIZ_LANG)} />;
  }
  if (lang !== DEFAULT_QUIZ_LANG) {
    return <RedirectWithSearch to={payRoutes.manage(DEFAULT_QUIZ_LANG)} />;
  }

  return <RedirectWithSearch to={payRoutes.manage(DEFAULT_QUIZ_LANG)} />;
};

const LegacyCheckoutRedirect = () => {
  const { lang, uuid } = useParams<{ lang?: string; uuid?: string }>();
  const resolvedLang = canonicalQuizLang(lang);
  if (!uuid) {
    return <RedirectWithSearch to={payRoutes.manage(resolvedLang)} />;
  }

  return <RedirectWithSearch to={payRoutes.checkout(resolvedLang, uuid)} />;
};

const CheckoutRoute = () => {
  const { lang, uuid } = useParams<{ lang?: string; uuid?: string }>();
  if (!isQuizLang(lang) || lang !== DEFAULT_QUIZ_LANG) {
    return <RedirectWithSearch to={payRoutes.checkout(DEFAULT_QUIZ_LANG, uuid ?? "")} />;
  }

  return <CheckoutPage />;
};

const SuccessRoute = () => {
  const { lang } = useParams<{ lang?: string }>();
  if (!isQuizLang(lang) || lang !== DEFAULT_QUIZ_LANG) {
    return <RedirectWithSearch to={payRoutes.success(DEFAULT_QUIZ_LANG)} />;
  }

  return <SuccessPage />;
};

const CancelRoute = () => {
  const { lang } = useParams<{ lang?: string }>();
  if (!isQuizLang(lang) || lang !== DEFAULT_QUIZ_LANG) {
    return <RedirectWithSearch to={payRoutes.cancel(DEFAULT_QUIZ_LANG)} />;
  }

  return <CancelPage />;
};

const ManageRoute = () => {
  const { lang } = useParams<{ lang?: string }>();
  if (!isQuizLang(lang) || lang !== DEFAULT_QUIZ_LANG) {
    return <RedirectWithSearch to={payRoutes.manage(DEFAULT_QUIZ_LANG)} />;
  }

  return <ManagePage />;
};

const PayBoundary = () => {
  const location = useLocation();
  const { locale, setLocale } = useI18n();
  const didSendInitialYandexPageViewRef = useRef(false);
  const defaultLang = useMemo(() => {
    const langCandidate = location.pathname.split("/")[1];
    return canonicalQuizLang(langCandidate || locale);
  }, [locale, location.pathname]);

  useEffect(() => {
    const langCandidate = location.pathname.split("/")[1];
    const nextLocale = canonicalQuizLang(langCandidate);
    if (nextLocale === locale) {
      return;
    }
    setLocale(nextLocale);
  }, [locale, location.pathname, setLocale]);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      propagateClickIdToLinks(location.search);
      logTracking("links", "propagateClickIdToLinks called", { pathname: location.pathname, search: location.search });
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!didSendInitialYandexPageViewRef.current) {
      didSendInitialYandexPageViewRef.current = true;
      return;
    }

    hitYandexMetrikaPage(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);

  return (
    <Routes>
      <Route path="/" element={<RedirectWithSearch to={payRoutes.manage(defaultLang)} />} />
      <Route path="/:lang" element={<LocalizedPayEntryPage />} />
      <Route path="/:lang/checkout/:uuid" element={<CheckoutRoute />} />
      <Route path="/:lang/pay/success" element={<SuccessRoute />} />
      <Route path="/:lang/pay/cancel" element={<CancelRoute />} />
      <Route path="/:lang/pay/manage" element={<ManageRoute />} />
      <Route path="/:lang/quiz/checkout/:uuid" element={<LegacyCheckoutRedirect />} />
      <Route path="*" element={<PayNotFoundPage defaultLang={defaultLang} />} />
    </Routes>
  );
};

export const AppRouter = () => {
  return <PayBoundary />;
};
