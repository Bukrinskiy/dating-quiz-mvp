import { Navigate, Route, Routes } from "react-router-dom";
import { Block6Page } from "../pages/Block6Page";
import { Block7Page } from "../pages/Block7Page";
import { LandingPage } from "../pages/LandingPage";
import { LegalPage } from "../pages/LegalPage";
import { PayRedirectPage } from "../pages/PayRedirectPage";
import { QuizBlockPage } from "../pages/QuizBlockPage";
import { useI18n } from "../features/i18n/I18nProvider";

export const App = () => {
  const { copy } = useI18n();

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
      <Route path="/terms.html" element={<LegalPage document={copy.legal.terms} />} />
      <Route path="/privacy-policy.html" element={<LegalPage document={copy.legal.privacy} />} />
      <Route path="/refund-policy.html" element={<LegalPage document={copy.legal.refund} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
