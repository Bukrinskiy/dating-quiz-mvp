import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Block6ScreenOne } from "../components/block6/Block6ScreenOne";
import { Block6ScreenTwo } from "../components/block6/Block6ScreenTwo";
import { useI18n } from "../features/i18n/I18nProvider";
import { addClickIdToPath } from "../shared/lib/clickid";
import { sendPostbackOnce } from "../shared/lib/tracking";
import { Container } from "../shared/ui/Container";
import { LanguageSwitcher } from "../shared/ui/LanguageSwitcher";
import { QuizCard } from "../shared/ui/QuizCard";
import { SiteFooter } from "../shared/ui/SiteFooter";

export const Block6Page = () => {
  const [screen, setScreen] = useState(0);
  const { copy } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const onFinish = () => {
    sendPostbackOnce("block6_completed", location.search);
    navigate(addClickIdToPath("/block-7", location.search));
  };

  return (
    <>
      <Container>
        <LanguageSwitcher />
        <QuizCard className="block6">
          <div className="block6__screens">
            {screen === 0 ? (
              <Block6ScreenOne
                title={copy.block6.screen1.title}
                paragraphs={copy.block6.screen1.paragraphs}
                timeline={copy.block6.screen1.timeline}
                cta={copy.block6.screen1.cta}
                onNext={() => setScreen(1)}
              />
            ) : (
              <Block6ScreenTwo
                title={copy.block6.screen2.title}
                intro={copy.block6.screen2.intro}
                anchor={copy.block6.screen2.anchor}
                postAnchor={copy.block6.screen2.postAnchor}
                loop={copy.block6.screen2.loop}
                microcopy={copy.block6.screen2.microcopy}
                cta={copy.block6.screen2.cta}
                onFinish={onFinish}
              />
            )}
          </div>
        </QuizCard>
      </Container>
      <SiteFooter />
    </>
  );
};
