import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HeroSection } from "../components/landing/HeroSection";
import { useI18n } from "../features/i18n/I18nProvider";
import { addClickIdToPath } from "../shared/lib/clickid";
import { MobiSlonEvent } from "../shared/lib/mobiSlonEvents";
import { sendPostbackOnce, track } from "../shared/lib/tracking";
import { LanguageSwitcher } from "../shared/ui/LanguageSwitcher";
import { SiteFooter } from "../shared/ui/SiteFooter";

export const LandingPage = () => {
  const { copy } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [videoFallback, setVideoFallback] = useState(false);
  const heroVideoSrc = copy.hero.videoSrc.trim();

  useEffect(() => {
    track("hero_view");
  }, []);

  const onStart = () => {
    track("hero_cta_click");
    sendPostbackOnce(MobiSlonEvent.START_QUIZ, location.search);
    navigate(addClickIdToPath("/block-1", location.search));
  };

  return (
    <>
      <main className="hero-page">
        <LanguageSwitcher />
        <HeroSection
          title={copy.hero.title}
          subtitle={copy.hero.subtitle}
          list={copy.hero.list}
          note={copy.hero.note}
          videoSrc={heroVideoSrc}
          cta={copy.hero.cta}
          microcopy={copy.hero.microcopy}
          fallbackText={copy.hero.fallback}
          fallback={videoFallback}
          onCtaClick={onStart}
          onVideoError={() => setVideoFallback(true)}
        />
      </main>
      <SiteFooter />
    </>
  );
};
