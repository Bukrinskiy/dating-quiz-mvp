import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { useLocation, useNavigate } from "react-router-dom";
import { type SiteLocale, siteLocales } from "../config/routes";

type LocaleSwitcherProps = {
  currentLocale: SiteLocale;
  resolveHref: (locale: SiteLocale) => string;
};

export const LocaleSwitcher = ({ currentLocale, resolveHref }: LocaleSwitcherProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="lang-switcher site-header__locale-switcher" aria-label="Language switcher">
      <ToggleGroup.Root
        className="lang-toggle"
        type="single"
        value={currentLocale}
        onValueChange={(value) => {
          if (value !== "en" && value !== "ru") {
            return;
          }

          const nextHref = resolveHref(value);
          if (nextHref !== location.pathname) {
            navigate(nextHref, { replace: true });
          }
        }}
        aria-label="Language"
      >
        {siteLocales.map((locale) => (
          <ToggleGroup.Item
            key={locale}
            className="lang-toggle__item"
            value={locale}
            aria-label={locale === "ru" ? "Russian" : "English"}
          >
            {locale.toUpperCase()}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </div>
  );
};
