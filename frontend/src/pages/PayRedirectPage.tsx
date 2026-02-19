import { useEffect } from "react";
import { useI18n } from "../features/i18n/I18nProvider";
import { logTracking } from "../shared/lib/trackingLogger";
import { Container } from "../shared/ui/Container";
import { LanguageSwitcher } from "../shared/ui/LanguageSwitcher";
import { QuizCard } from "../shared/ui/QuizCard";
import { SiteFooter } from "../shared/ui/SiteFooter";

export const PayRedirectPage = () => {
  const { copy } = useI18n();

  useEffect(() => {
    logTracking("payment", "payment page opened while payment is disabled");
  }, []);

  return (
    <>
      <Container>
        <LanguageSwitcher />
        <QuizCard>
          <h1>{copy.ui.payWait}</h1>
          <p>{copy.ui.payUnavailable}</p>
        </QuizCard>
      </Container>
      <SiteFooter />
    </>
  );
};
