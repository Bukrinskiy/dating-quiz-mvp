import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../../features/i18n/useI18n";
import { type QuizLang } from "../config/routes";

type LanguageSwitcherProps = {
  withUrlPrefix?: boolean;
  className?: string;
};

const switchLangInPath = (pathname: string, lang: QuizLang): string => {
  if (/^\/(ru|en)(\/|$)/.test(pathname)) {
    return pathname.replace(/^\/(ru|en)(?=\/|$)/, `/${lang}`);
  }
  return `/${lang}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
};

export const LanguageSwitcher = ({ withUrlPrefix = false, className = "" }: LanguageSwitcherProps) => {
  const { locale, setLocale, copy } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className={`lang-switcher ${className}`.trim()} aria-label="Language switcher">
      <ToggleGroup.Root
        className="lang-toggle"
        type="single"
        value={locale}
        onValueChange={(value) => {
          if (value === "ru" || value === "en") {
            setLocale(value);
            if (withUrlPrefix) {
              const nextPath = switchLangInPath(location.pathname, value);
              if (nextPath !== location.pathname) {
                navigate(`${nextPath}${location.search}`, { replace: true });
              }
            }
          }
        }}
        aria-label="Language"
      >
        <ToggleGroup.Item className="lang-toggle__item" value="ru" aria-label="Russian">
          {copy.ui.langRu}
        </ToggleGroup.Item>
        <ToggleGroup.Item className="lang-toggle__item" value="en" aria-label="English">
          {copy.ui.langEn}
        </ToggleGroup.Item>
      </ToggleGroup.Root>
    </div>
  );
};
