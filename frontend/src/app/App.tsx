import { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Block6Page } from "../pages/Block6Page";
import { Block7Page } from "../pages/Block7Page";
import { LandingPage } from "../pages/LandingPage";
import { LegalPage } from "../pages/LegalPage";
import { PayCancelPage } from "../pages/PayCancelPage";
import { PayManagePage } from "../pages/PayManagePage";
import { PayRedirectPage } from "../pages/PayRedirectPage";
import { PaySuccessPage } from "../pages/PaySuccessPage";
import { QuizBlockPage } from "../pages/QuizBlockPage";
import { useI18n } from "../features/i18n/I18nProvider";
import { propagateClickIdToLinks } from "../shared/lib/clickid";
import { logTracking } from "../shared/lib/trackingLogger";

export const App = () => {
  const { copy } = useI18n();
  const location = useLocation();
  const didSendInitialPageViewRef = useRef(false);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      propagateClickIdToLinks(location.search);
      logTracking("links", "propagateClickIdToLinks called", { pathname: location.pathname, search: location.search });
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!didSendInitialPageViewRef.current) {
      didSendInitialPageViewRef.current = true;
      return;
    }

    const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
    if (typeof fbq === "function") {
      fbq("track", "PageView");
      logTracking("facebook", "PageView tracked on route change", { pathname: location.pathname, search: location.search });
      return;
    }
    logTracking("facebook", "fbq is not available on route change", { pathname: location.pathname }, "warn");
  }, [location.pathname, location.search]);

  useEffect(() => {
    const bPixel = (window as Window & { BPixelJS?: { useTokens?: (fn: () => void) => void } }).BPixelJS;
    if (!bPixel?.useTokens) {
      logTracking("mobi-slon", "BPixelJS.useTokens is not available", undefined, "warn");
      return;
    }

    logTracking("mobi-slon", "BPixelJS.useTokens callback registered");
    bPixel.useTokens(() => {
      propagateClickIdToLinks(window.location.search);
      logTracking("mobi-slon", "BPixelJS.useTokens callback fired");
    });
  }, []);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/block-6" element={<Block6Page />} />
      <Route path="/block-7" element={<Block7Page />} />
      <Route path="/block-1" element={<QuizBlockPage key="block-1" blockId={1} />} />
      <Route path="/block-2" element={<QuizBlockPage key="block-2" blockId={2} />} />
      <Route path="/block-3" element={<QuizBlockPage key="block-3" blockId={3} />} />
      <Route path="/block-4" element={<QuizBlockPage key="block-4" blockId={4} />} />
      <Route path="/block-5" element={<QuizBlockPage key="block-5" blockId={5} />} />
      <Route path="/pay" element={<PayRedirectPage />} />
      <Route path="/pay/success" element={<PaySuccessPage />} />
      <Route path="/pay/cancel" element={<PayCancelPage />} />
      <Route path="/pay/manage" element={<PayManagePage />} />
      <Route path="/terms.html" element={<LegalPage document={copy.legal.terms} />} />
      <Route path="/privacy-policy.html" element={<LegalPage document={copy.legal.privacy} />} />
      <Route path="/refund-policy.html" element={<LegalPage document={copy.legal.refund} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
