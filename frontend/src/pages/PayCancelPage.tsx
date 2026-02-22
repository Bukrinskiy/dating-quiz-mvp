import { Link } from "react-router-dom";
import { useI18n } from "../features/i18n/I18nProvider";
import { Container } from "../shared/ui/Container";
import { LanguageSwitcher } from "../shared/ui/LanguageSwitcher";
import { QuizCard } from "../shared/ui/QuizCard";
import { SiteFooter } from "../shared/ui/SiteFooter";

export const PayCancelPage = () => {
  const { copy } = useI18n();

  return (
    <>
      <Container>
        <LanguageSwitcher />
        <QuizCard>
          <h1>{copy.ui.payCancelTitle}</h1>
          <p className="pay-copy">{copy.ui.payCancelBody}</p>
          <Link to="/pay" className="btn">
            {copy.ui.payStart}
          </Link>
        </QuizCard>
      </Container>
      <SiteFooter />
    </>
  );
};
