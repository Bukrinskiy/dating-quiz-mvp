import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../features/i18n/I18nProvider";
import { getClickId } from "../shared/lib/clickid";
import { Container } from "../shared/ui/Container";
import { LanguageSwitcher } from "../shared/ui/LanguageSwitcher";
import { QuizCard } from "../shared/ui/QuizCard";
import { SiteFooter } from "../shared/ui/SiteFooter";

export const PayRedirectPage = () => {
  const location = useLocation();
  const { copy } = useI18n();
  const clickId = useMemo(() => getClickId(location.search), [location.search]);

  useEffect(() => {
    if (!clickId) {
      return;
    }

    const target = new URL("/api/payment/redirect", window.location.origin);
    target.searchParams.set("clickid", clickId);
    window.location.href = target.toString();
  }, [clickId]);

  return (
    <>
      <Container>
        <LanguageSwitcher />
        <QuizCard>
          <h1>{copy.ui.payWait}</h1>
          {!clickId ? <p>{copy.ui.payError}</p> : null}
        </QuizCard>
      </Container>
      <SiteFooter />
    </>
  );
};
