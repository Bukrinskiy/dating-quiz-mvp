import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { I18nProvider } from "./features/i18n/I18nProvider";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components/hero.css";
import "./styles/components/quiz.css";
import "./styles/components/quiz-ux.css";
import "./styles/components/block6.css";
import "./styles/components/block7.css";
import "./styles/components/legal.css";
import "./styles/components/footer.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <App />
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
