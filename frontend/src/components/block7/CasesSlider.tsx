import { useEffect, useMemo, useRef, useState } from "react";
import type { CaseReview } from "../../features/i18n/messages";
import { CasesDots } from "./CasesDots";

type CasesSliderProps = {
  cases: CaseReview[];
};

const getVisibleCards = () => {
  if (window.matchMedia("(min-width: 1080px)").matches) {
    return 3;
  }
  if (window.matchMedia("(min-width: 720px)").matches) {
    return 2;
  }
  return 1;
};

const shuffleForDesktopPriority = <T,>(items: T[]): T[] => {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = list[i];
    list[i] = list[j];
    list[j] = temp;
  }
  const top = list.slice(0, 3);
  const rest = items.filter((item) => !top.includes(item));
  return [...top, ...rest];
};

export const CasesSlider = ({ cases }: CasesSliderProps) => {
  const orderedCases = useMemo(() => shuffleForDesktopPriority(cases), [cases]);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    const syncPages = () => {
      const visibleCards = getVisibleCards();
      const nextPages = Math.max(1, Math.ceil(orderedCases.length / visibleCards));
      setPages(nextPages);
      setActiveIndex((prev) => Math.min(prev, nextPages - 1));
    };

    syncPages();
    window.addEventListener("resize", syncPages);

    return () => {
      window.removeEventListener("resize", syncPages);
    };
  }, [orderedCases.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    const onScroll = () => {
      const visibleCards = getVisibleCards();
      const step = track.clientWidth;
      const nextIndex = Math.max(0, Math.min(Math.ceil(orderedCases.length / visibleCards) - 1, Math.round(track.scrollLeft / step)));
      setActiveIndex(nextIndex);
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
    };
  }, [orderedCases.length]);

  const onSelect = (index: number) => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    track.scrollTo({ left: track.clientWidth * index, behavior: "smooth" });
  };

  return (
    <>
      <div ref={trackRef} className="block7-cases" tabIndex={0} data-block7-cases>
        {orderedCases.map((item) => (
          <article key={item.name} className="block7-case">
            <div className="block7-case__head">
              <div className="block7-avatar" aria-hidden="true">
                <img className="block7-avatar__img" src={item.image} alt={item.imageAlt} />
              </div>
            </div>
            <h3>{item.name}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
      <CasesDots pages={pages} activeIndex={activeIndex} onSelect={onSelect} />
    </>
  );
};
