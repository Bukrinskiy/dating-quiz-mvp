import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

import { I18nProvider, type AppLocale } from "../app/i18n";

type RenderWithI18nOptions = RenderOptions & {
  locale?: AppLocale;
};

export function renderWithI18n(ui: ReactElement, { locale = "en", wrapper: Wrapper, ...options }: RenderWithI18nOptions = {}) {
  function I18nWrapper({ children }: { children: ReactNode }) {
    const content = <I18nProvider locale={locale}>{children}</I18nProvider>;
    return Wrapper ? <Wrapper>{content}</Wrapper> : content;
  }

  return render(ui, { wrapper: I18nWrapper, ...options });
}
