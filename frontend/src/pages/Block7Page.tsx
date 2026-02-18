import { useLocation, useNavigate } from "react-router-dom";
import { Block7Sections } from "../components/block7/Block7Sections";
import { useI18n } from "../features/i18n/I18nProvider";
import { addClickIdToPath } from "../shared/lib/clickid";
import { sendPostbackOnce } from "../shared/lib/tracking";
import { Container } from "../shared/ui/Container";
import { LanguageSwitcher } from "../shared/ui/LanguageSwitcher";
import { QuizCard } from "../shared/ui/QuizCard";
import { SiteFooter } from "../shared/ui/SiteFooter";

export const Block7Page = () => {
  const { copy } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const onPay = () => {
    sendPostbackOnce("transition_to_payment", location.search);
    navigate(addClickIdToPath("/pay", location.search));
  };

  return (
    <>
      <Container>
        <LanguageSwitcher />
        <QuizCard className="block7">
          <div className="block7__layout">
            <Block7Sections copy={copy.block7} onPay={onPay} />
          </div>
        </QuizCard>
      </Container>
      <SiteFooter />
    </>
  );
};
