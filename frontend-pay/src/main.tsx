import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { I18nProvider } from "./features/i18n/I18nProvider";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components/legal.css";
import "./styles/components/new-pay.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <App />
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
