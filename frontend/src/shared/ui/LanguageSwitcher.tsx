import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { useI18n } from "../../features/i18n/I18nProvider";

export const LanguageSwitcher = () => {
  const { locale, setLocale, copy } = useI18n();

  return (
    <div className="lang-switcher" aria-label="Language switcher">
      <ToggleGroup.Root
        className="lang-toggle"
        type="single"
        value={locale}
        onValueChange={(value) => {
          if (value === "ru" || value === "en") {
            setLocale(value);
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
