import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import quizStepsEnRaw from "./newQuizStepsEn.json";
import { DEFAULT_QUIZ_LANG, isQuizLang, quizRoutes, type QuizLang } from "../../shared/config/routes";
import { addClickIdToPath, getClickId, getTrackingParams } from "../../entities/tracking-attribution/model";
import { createQuizSession, getSessionCurrency } from "../../entities/quiz-session";
import { sendPostbackOnce, track } from "../../shared/lib/tracking";
import { reachYandexMetrikaGoal } from "../../shared/lib/yandexMetrika";
import { SiteFooter } from "../../shared/ui/SiteFooter";
import { newQuizContent, promptGoalIconByTitle, promptLearningIconByTitle, promptSkillIconByTitle } from "../../features/quiz/newQuizContent";
import type { LandingManifest } from "../../entities/landing-manifest";

type IconOption = {
  title: string;
  image?: string;
  svgIcon?: string;
  svgIconActive?: string;
};

type RateOption = {
  answer: number;
  svgIcon: string;
  svgIconActive: string;
};

type QuizStep =
  | { step: number; type: "single"; question: string; answers: Array<string | IconOption>; uiTag?: string }
  | { step: number; type: "single-selection-with-image"; question: string; answers: IconOption[]; uiTag?: string }
  | { step: number; type: "single-selection-with-svg"; question: string; answers: IconOption[]; uiTag?: string }
  | { step: number; type: "multiple"; question: string; description: string; answers: IconOption[]; uiTag?: string }
  | { step: number; type: "slide"; question: string; description: string; uiTag?: string }
  | { step: number; type: "single-rate"; statement: string; question: string; answers: RateOption[]; uiTag?: string }
  | { step: number; type: "prompt-1" | "prompt-2" | "prompt-3" | "prompt-4" | "prompt-5" | "prompt-6" | "prompt-7" }
  | { step: number; type: "calculating-screen" }
  | { step: number; type: "result-screen" };

const quizStepsEn = quizStepsEnRaw as QuizStep[];

const QUIZ_STORAGE_KEY = "new_quiz_answers";

const ASSET_PREFIX = "/quiz-affemity-funnel";
const asset = (path: string): string => `${ASSET_PREFIX}${path}`;
const RESULT_SCREEN_DIAGRAM_SRC = asset("/images/quiz/quiz-affemity-funnel/result-screen-diagram-seranking-en.jpg");

const skillIcon = (title: string): string => {
  return promptSkillIconByTitle[title] ?? asset("/icons/quiz/quiz-affemity-funnel/prompt-2-starting.svg");
};

const goalIcon = (title: string): string => {
  return promptGoalIconByTitle[title] ?? asset("/icons/quiz/quiz-affemity-funnel/prompt-2-goal-4.svg");
};

const learnIcon = (title: string): string => {
  return promptLearningIconByTitle[title] ?? asset("/icons/quiz/quiz-affemity-funnel/prompt-7-learning-goal-4.svg");
};

const getOptionTitle = (option: string | IconOption): string => (typeof option === "string" ? option : option.title);

type StoredState = {
  stepIndex: number;
  answers: Record<string, string | number | string[]>;
};

const parseStepParam = (value: string | undefined, totalSteps: number): number | null => {
  if (!value) return 0;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  if (parsed < 1 || parsed > totalSteps) return null;
  return parsed - 1;
};

const pruneFutureAnswers = (
  source: Record<string, string | number | string[]>,
  currentStepNumber: number,
): Record<string, string | number | string[]> => {
  const next: Record<string, string | number | string[]> = {};
  Object.entries(source).forEach(([key, value]) => {
    const numericKey = Number(key);
    if (Number.isFinite(numericKey) && numericKey > currentStepNumber) {
      return;
    }
    next[key] = value;
  });
  return next;
};

type QuizPageProps = {
  manifest: LandingManifest;
};

export const QuizPage = ({ manifest }: QuizPageProps) => {
  const { step: stepParam, lang: langParam } = useParams<{ step?: string; lang?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const lang: QuizLang = isQuizLang(langParam) ? langParam : DEFAULT_QUIZ_LANG;
  const quizSteps = quizStepsEn as QuizStep[];
  const i18nContent = newQuizContent[lang];
  const promptFourReviews = i18nContent.prompt4.reviews;
  const promptFourLoopedReviews = [promptFourReviews[promptFourReviews.length - 1], ...promptFourReviews, promptFourReviews[0]];
  const calcReviews = i18nContent.calc.reviews;
  const calcLoopedReviews = [calcReviews[calcReviews.length - 1], ...calcReviews, calcReviews[0]];
  const stepIndexFromUrl = useMemo(() => parseStepParam(stepParam, quizSteps.length), [quizSteps.length, stepParam]);
  const [stepIndex, setStepIndex] = useState(stepIndexFromUrl ?? 0);
  const [answers, setAnswers] = useState<Record<string, string | number | string[]>>({});
  const [multiDraft, setMultiDraft] = useState<string[]>([]);
  const [slideDraft, setSlideDraft] = useState(5);
  const [calcProgress, setCalcProgress] = useState([0, 0, 0, 0]);
  const [calcReviewIndex, setCalcReviewIndex] = useState(1);
  const [promptFourVirtualIndex, setPromptFourVirtualIndex] = useState(1);
  const [potentialMarkerPos, setPotentialMarkerPos] = useState(65);
  const [pressedChoiceKey, setPressedChoiceKey] = useState<string | null>(null);
  const [pressedCtaKey, setPressedCtaKey] = useState<string | null>(null);
  const promptCarouselRef = useRef<HTMLDivElement | null>(null);
  const calcCarouselRef = useRef<HTMLDivElement | null>(null);
  const promptJumpingRef = useRef(false);
  const calcJumpingRef = useRef(false);
  const skipCalcSyncRef = useRef(false);
  const selectTimerRef = useRef<number | null>(null);
  const ctaTimerRef = useRef<number | null>(null);
  const startQuizSentRef = useRef(false);
  const sendQuestionCompleted = useCallback((pageNumber: number) => {
    const status = `${pageNumber}_question_completed`;
    sendPostbackOnce(status, location.search, { sessionId: `quiz-step-${pageNumber}` });
  }, [location.search]);
  const navigateToStep = useCallback((nextIndex: number, replace = false) => {
    const bounded = Math.max(0, Math.min(quizSteps.length - 1, nextIndex));
    if (bounded > stepIndex) {
      sendQuestionCompleted(quizSteps[stepIndex].step);
    }
    const nextPath = quizRoutes.step(lang, bounded + 1);
    if (location.pathname !== nextPath) {
      navigate(addClickIdToPath(nextPath, location.search), { replace });
    }
    setStepIndex(bounded);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [lang, location.pathname, location.search, navigate, quizSteps, sendQuestionCompleted, stepIndex]);

  const currentStep = quizSteps[stepIndex];
  const current = stepIndex + 1;
  const total = quizSteps.length;
  const homeHref = addClickIdToPath(quizRoutes.root(manifest.default_locale), location.search);
  const isCoarsePointer = useMemo(
    () => window.matchMedia?.("(hover: none) and (pointer: coarse)").matches ?? false,
    [],
  );
  const uiCopy = useMemo(() => ({
    continue: i18nContent.ui.continue,
    rateLeft: i18nContent.ui.rateLeft,
    rateRight: i18nContent.ui.rateRight,
    scaleMin: i18nContent.ui.scaleMin,
    scaleMax: i18nContent.ui.scaleMax,
    profilePotential: i18nContent.ui.profilePotential,
    loadingPlan: i18nContent.ui.loadingPlan,
    finalCta: i18nContent.ui.finalCta,
  }), [i18nContent]);

  useEffect(() => {
    let pollTimer: number | null = null;
    let stopPollTimer: number | null = null;
    const clearPoll = () => {
      if (pollTimer !== null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
      if (stopPollTimer !== null) {
        window.clearTimeout(stopPollTimer);
        stopPollTimer = null;
      }
    };
    const trySendStartQuiz = () => {
      if (startQuizSentRef.current) {
        return true;
      }
      const clickId = getClickId(location.search)?.trim();
      if (!clickId) {
        return false;
      }
      track("new_quiz_view");
      track("quiz_start");
      reachYandexMetrikaGoal("start_quiz");
      startQuizSentRef.current = true;
      clearPoll();
      return true;
    };

    if (trySendStartQuiz()) {
      return () => clearPoll();
    }

    type PixelApi = { onPixelLoaded?: (handler: () => void) => void; useTokens?: (handler: () => void) => void };
    const pixelApi = (window as Window & { BPixelJS?: PixelApi }).BPixelJS;
    const onReady = () => {
      trySendStartQuiz();
    };
    if (pixelApi?.onPixelLoaded) {
      pixelApi.onPixelLoaded(onReady);
    } else if (pixelApi?.useTokens) {
      pixelApi.useTokens(onReady);
    }

    pollTimer = window.setInterval(() => {
      trySendStartQuiz();
    }, 250);
    stopPollTimer = window.setTimeout(() => {
      clearPoll();
    }, 8000);

    return () => clearPoll();
  }, [location.search]);

  useEffect(() => {
    try {
      if (stepIndexFromUrl === 0) {
        localStorage.removeItem(QUIZ_STORAGE_KEY);
        setAnswers({});
        return;
      }
      const raw = localStorage.getItem(QUIZ_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredState;
      if (parsed.answers) setAnswers(parsed.answers);
    } catch {
      // ignore corrupted state
    }
  }, [stepIndexFromUrl]);

  useEffect(() => {
    if (stepIndexFromUrl === null) {
      navigate(addClickIdToPath(quizRoutes.step(lang, 1), location.search), { replace: true });
      return;
    }
    if (stepIndexFromUrl !== stepIndex) {
      setStepIndex(stepIndexFromUrl);
    }
  }, [lang, location.search, navigate, stepIndex, stepIndexFromUrl]);

  useEffect(() => {
    const eventId = `Q-${String(current).padStart(3, "0")}`;
    track(eventId);
  }, [current]);

  useEffect(() => {
    const payload: StoredState = { stepIndex, answers };
    try {
      localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }, [stepIndex, answers]);

  useEffect(() => {
    setPressedChoiceKey(null);
    setPressedCtaKey(null);
  }, [stepIndex]);

  useEffect(() => () => {
    if (selectTimerRef.current !== null) {
      window.clearTimeout(selectTimerRef.current);
    }
    if (ctaTimerRef.current !== null) {
      window.clearTimeout(ctaTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (currentStep.type !== "calculating-screen") return;

    const BAR_DURATION_MS = 2800;
    const BAR_TICK_MS = 80;
    const BAR_PAUSE_MS = 180;
    const FINAL_PAUSE_MS = 550;
    const REVIEW_AUTO_MS = 3000;
    const LOOP_RESET_MS = 420;

    setCalcProgress([0, 0, 0, 0]);
    setCalcReviewIndex(1);
    let currentVirtualIndex = 1;
    const totalReviews = calcReviews.length;
    let reviewAutoTimer: number | null = null;
    let loopResetTimer: number | null = null;
    let cancelled = false;

    const getCardWidth = (carousel: HTMLDivElement) => {
      const firstCard = carousel.querySelector<HTMLElement>(".flirt-quiz__calc-review-card");
      if (!firstCard) return 0;
      const styles = window.getComputedStyle(carousel);
      const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
      return firstCard.offsetWidth + gap;
    };

    const scrollToVirtual = (virtualIndex: number, behavior: ScrollBehavior) => {
      const carousel = calcCarouselRef.current;
      if (!carousel) return;
      const cardWidth = getCardWidth(carousel);
      if (!cardWidth) return;
      carousel.scrollTo({ left: virtualIndex * cardWidth, behavior });
    };

    window.requestAnimationFrame(() => {
      if (!cancelled) {
        scrollToVirtual(1, "auto");
      }
    });

    reviewAutoTimer = window.setInterval(() => {
      if (cancelled) return;
      if (currentVirtualIndex < totalReviews) {
        currentVirtualIndex += 1;
        setCalcReviewIndex(currentVirtualIndex);
        scrollToVirtual(currentVirtualIndex, "smooth");
        return;
      }

      currentVirtualIndex = totalReviews + 1;
      scrollToVirtual(currentVirtualIndex, "smooth");
      if (loopResetTimer !== null) {
        window.clearTimeout(loopResetTimer);
      }
      loopResetTimer = window.setTimeout(() => {
        if (cancelled) return;
        calcJumpingRef.current = true;
        currentVirtualIndex = 1;
        setCalcReviewIndex(1);
        scrollToVirtual(1, "auto");
        window.requestAnimationFrame(() => {
          calcJumpingRef.current = false;
        });
      }, LOOP_RESET_MS);
    }, REVIEW_AUTO_MS);

    const tickStep = 100 / (BAR_DURATION_MS / BAR_TICK_MS);
    const timeouts: number[] = [];
    const wait = (ms: number) => new Promise<void>((resolve) => {
      const timerId = window.setTimeout(resolve, ms);
      timeouts.push(timerId);
    });

    const runSequentialFill = async () => {
      const progress = [0, 0, 0, 0];
      for (let barIndex = 0; barIndex < progress.length; barIndex += 1) {
        while (progress[barIndex] < 100 && !cancelled) {
          progress[barIndex] = Math.min(100, progress[barIndex] + tickStep);
          setCalcProgress((prev) => {
            const next = [...prev];
            next[barIndex] = progress[barIndex];
            return next;
          });
          await wait(BAR_TICK_MS);
        }
        if (cancelled) return;
        await wait(BAR_PAUSE_MS);
      }
      await wait(FINAL_PAUSE_MS);
      if (!cancelled) {
        navigateToStep(stepIndex + 1);
      }
    };
    void runSequentialFill();

    return () => {
      cancelled = true;
      if (reviewAutoTimer !== null) {
        window.clearInterval(reviewAutoTimer);
      }
      if (loopResetTimer !== null) {
        window.clearTimeout(loopResetTimer);
      }
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [calcReviews.length, currentStep.type, navigateToStep, stepIndex]);

  useEffect(() => {
    if (currentStep.type !== "slide") return;
    const saved = answers[String(currentStep.step)];
    if (typeof saved === "number" && Number.isFinite(saved)) {
      setSlideDraft(Math.max(0, Math.min(10, saved)));
      return;
    }
    setSlideDraft(5);
  }, [answers, currentStep]);

  useEffect(() => {
    if (currentStep.type !== "prompt-4") return;
    const carousel = promptCarouselRef.current;
    if (!carousel) return;
    const jumpToVirtual = window.setTimeout(() => {
      const firstCard = carousel.querySelector<HTMLElement>(".flirt-quiz__review-card--carousel");
      const styles = window.getComputedStyle(carousel);
      const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
      const pageWidth = firstCard ? firstCard.offsetWidth + gap : carousel.clientWidth;
      carousel.scrollTo({ left: pageWidth, behavior: "auto" });
      setPromptFourVirtualIndex(1);
    }, 0);
    return () => window.clearTimeout(jumpToVirtual);
  }, [currentStep.type, stepIndex]);

  useEffect(() => {
    if (currentStep.type !== "prompt-7") return;
    setPotentialMarkerPos(12);
    const timerId = window.setTimeout(() => {
      setPotentialMarkerPos(65);
    }, 80);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [currentStep.type, stepIndex]);

  useEffect(() => {
    if (currentStep.step !== 25) return;
    const preloadedImage = new Image();
    preloadedImage.src = RESULT_SCREEN_DIAGRAM_SRC;
  }, [currentStep.step]);

  const nextStep = () => {
    navigateToStep(stepIndex + 1);
  };

  const prevStep = () => {
    if (stepIndex === 0 || currentStep.type === "calculating-screen") return;
    navigateToStep(stepIndex - 1);
  };

  const selectSingle = (value: string | number, visualKey?: string) => {
    setAnswers((prev) => {
      const next = pruneFutureAnswers(prev, currentStep.step);
      next[String(currentStep.step)] = value;
      return next;
    });
    if (isCoarsePointer) {
      if (selectTimerRef.current !== null) {
        window.clearTimeout(selectTimerRef.current);
      }
      setPressedChoiceKey(`${currentStep.step}:${visualKey ?? String(value)}`);
      selectTimerRef.current = window.setTimeout(() => {
        setPressedChoiceKey(null);
        nextStep();
      }, 170);
      return;
    }
    nextStep();
  };

  const submitMulti = () => {
    if (multiDraft.length === 0) return;
    setAnswers((prev) => {
      const next = pruneFutureAnswers(prev, currentStep.step);
      next[String(currentStep.step)] = multiDraft;
      return next;
    });
    setMultiDraft([]);
    nextStep();
  };

  const submitSlide = () => {
    setAnswers((prev) => {
      const next = pruneFutureAnswers(prev, currentStep.step);
      next[String(currentStep.step)] = slideDraft;
      return next;
    });
    nextStep();
  };

  const runCtaAction = (key: string, action: () => void) => {
    if (!isCoarsePointer) {
      action();
      return;
    }
    if (ctaTimerRef.current !== null) {
      window.clearTimeout(ctaTimerRef.current);
    }
    setPressedCtaKey(`${currentStep.step}:${key}`);
    ctaTimerRef.current = window.setTimeout(() => {
      setPressedCtaKey(null);
      action();
    }, 160);
  };

  const completeQuiz = async () => {
    sendQuestionCompleted(currentStep.step);
    track("new_quiz_complete");
    try {
      const currencyPayload = await getSessionCurrency(lang);
      const clickid = getClickId(location.search)?.trim() || "direct";
      const params = getTrackingParams(location.search);
      const trackingParams: Record<string, string> = {};
      params.forEach((value, key) => {
        const cleanKey = key.trim();
        const cleanValue = value.trim();
        if (!cleanKey || !cleanValue) {
          return;
        }
        trackingParams[cleanKey] = cleanValue;
      });
      const taggedAnswers: Record<string, unknown> = { ...answers };
      quizSteps.forEach((step) => {
        if (!("uiTag" in step) || !step.uiTag) {
          return;
        }
        const raw = answers[String(step.step)];
        if (typeof raw === "undefined") {
          return;
        }
        taggedAnswers[step.uiTag] = raw;
      });
      const payload = await createQuizSession({
        locale: lang,
        currency: currencyPayload.currency,
        answers: taggedAnswers,
        clickid,
        brand: "flirto_guru",
        landing_id: manifest.landing_id,
        entry_host: window.location.host,
        entry_path: window.location.pathname,
        tracking_params: trackingParams,
      });
      try {
        sessionStorage.setItem("quiz_session_uuid", payload.uuid);
      } catch {
        // ignore storage errors
      }
      navigate(addClickIdToPath(quizRoutes.email(lang, payload.uuid), location.search));
    } catch {
      navigate(addClickIdToPath(quizRoutes.root(lang), location.search));
    }
  };

  const resultGoal = String(answers["1"] ?? i18nContent.defaults.resultGoal);
  const resultSkills = (answers["6"] as string[] | undefined) ?? [i18nContent.defaults.resultSkill];
  const resultLearn = String(answers["23"] ?? i18nContent.defaults.resultLearn);
  const ghosted = String(answers["19"] ?? i18nContent.defaults.ghostedNo);
  const slidePercent = (slideDraft / 10) * 100;
  const isIntroStep = currentStep.type === "single-selection-with-image";
  const setPromptReviewByIndex = (nextIndex: number) => {
    const totalReviews = promptFourReviews.length;
    const normalized = ((nextIndex % totalReviews) + totalReviews) % totalReviews;
    const carousel = promptCarouselRef.current;
    if (!carousel) return;
    const firstCard = carousel.querySelector<HTMLElement>(".flirt-quiz__review-card--carousel");
    const styles = window.getComputedStyle(carousel);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
    const pageWidth = firstCard ? firstCard.offsetWidth + gap : carousel.clientWidth;
    if (!pageWidth) return;
    setPromptFourVirtualIndex(normalized + 1);
    carousel.scrollTo({ left: (normalized + 1) * pageWidth, behavior: "smooth" });
  };

  return (
    <main className={`flirt-quiz ${isIntroStep ? "flirt-quiz--intro" : ""}`.trim()}>
      <section className="flirt-quiz__container flirt-quiz__container--with-legal">
        <header className="flirt-quiz__header">
          <div className="flirt-quiz__header-main">
            <div className="flirt-quiz__header-brand">
              <Link to={homeHref} className="flirt-quiz__logo-link" aria-label={i18nContent.ui.ariaGoHome}>
                <img className="flirt-quiz__logo" src="/flirto-logo.png" alt="Flirto Guru" />
              </Link>
            </div>
          </div>
          <div className="flirt-quiz__progress">
            <span style={{ width: `${(current / total) * 100}%` }} />
            {[0, 33, 66, 100].map((point) => (
              <span
                key={`progress-dot-${point}`}
                className={`flirt-quiz__progress-dot ${(current / total) * 100 >= point ? "is-filled" : ""}`.trim()}
                style={{ left: `${point}%` }}
              />
            ))}
          </div>
        </header>
        {stepIndex > 0 && currentStep.type !== "calculating-screen" ? (
          <button type="button" className="flirt-quiz__back-inline" onClick={prevStep}>
            <img src={asset("/icons/quiz/quiz-affemity-funnel/quiz-header-back-icon.svg")} alt={i18nContent.ui.ariaBack} />
            <span>{i18nContent.ui.ariaBack}</span>
          </button>
        ) : null}

        <section className="flirt-quiz__body">
          {currentStep.type === "single-selection-with-image" ? (
            <>
              <h1 className="flirt-quiz__title">{currentStep.question}</h1>
              <div className="flirt-quiz__grid flirt-quiz__grid--image">
                {currentStep.answers.map((option, idx) => {
                  const isPressed = pressedChoiceKey === `${currentStep.step}:${option.title}`;
                  return (
                    <button
                      key={`opt-${idx}`}
                      type="button"
                      className={`flirt-quiz__choice flirt-quiz__choice--image ${isPressed ? "is-pressed" : ""}`.trim()}
                      onClick={() => selectSingle(option.title, option.title)}
                    >
                      <img className="flirt-quiz__choice-image" src={asset(option.image || "")} alt="" />
                      <img className="flirt-quiz__choice-image-icon" src={asset((isPressed ? option.svgIconActive : option.svgIcon) || "")} alt="" />
                      <div className="flirt-quiz__choice-row">
                        <span>{option.title}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {currentStep.type === "single" ? (
            <>
              <h1 className="flirt-quiz__title">{currentStep.question}</h1>
              <div className="flirt-quiz__grid">
                {currentStep.answers.map((option, idx) => (
                  <button
                    key={`opt-${idx}`}
                    type="button"
                    className={`flirt-quiz__choice flirt-quiz__choice--svg ${pressedChoiceKey === `${currentStep.step}:${getOptionTitle(option)}` ? "is-pressed" : ""}`.trim()}
                    onClick={() => selectSingle(getOptionTitle(option), getOptionTitle(option))}
                  >
                    <span>{getOptionTitle(option)}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {currentStep.type === "single-selection-with-svg" ? (
            <>
              <h1 className="flirt-quiz__title">{currentStep.question}</h1>
              <div className="flirt-quiz__grid">
                {currentStep.answers.map((option, idx) => {
                  const isPressed = pressedChoiceKey === `${currentStep.step}:${option.title}`;
                  return (
                    <button
                      key={`opt-${idx}`}
                      type="button"
                      className={`flirt-quiz__choice flirt-quiz__choice--svg ${isPressed ? "is-pressed" : ""}`.trim()}
                      onClick={() => selectSingle(option.title, option.title)}
                    >
                      <img src={asset((isPressed ? option.svgIconActive : option.svgIcon) || "")} alt="" />
                      <span>{option.title}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {currentStep.type === "multiple" ? (
            <>
              <h1 className="flirt-quiz__title">{currentStep.question}</h1>
              <p className="flirt-quiz__subtitle">{currentStep.description}</p>
              <div className="flirt-quiz__grid">
                {currentStep.answers.map((option, idx) => {
                  const selected = multiDraft.includes(option.title);
                  return (
                    <button
                      key={`opt-${idx}`}
                      type="button"
                      className={`flirt-quiz__choice flirt-quiz__choice--multi ${selected ? "is-selected" : ""}`.trim()}
                      onClick={() => {
                        setMultiDraft((prev) => (prev.includes(option.title) ? prev.filter((item) => item !== option.title) : [...prev, option.title]));
                      }}
                    >
                      <img src={asset(selected ? option.svgIconActive || "" : option.svgIcon || "")} alt="" />
                      <span>{option.title}</span>
                      <img src={asset(selected ? "/icons/quiz/quiz-affemity-funnel/multiple-checked.svg" : "/icons/quiz/quiz-affemity-funnel/multiple-check.svg")} alt="" />
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className={`flirt-quiz__cta ${pressedCtaKey === `${currentStep.step}:multi-continue` ? "is-pressed" : ""}`.trim()}
                disabled={multiDraft.length === 0}
                onClick={() => runCtaAction("multi-continue", submitMulti)}
              >
                {uiCopy.continue}
              </button>
            </>
          ) : null}

          {currentStep.type === "single-rate" ? (
            <div className="flirt-quiz__rate-screen">
              <h1 className="flirt-quiz__title">{currentStep.statement}</h1>
              <p className="flirt-quiz__statement">{currentStep.question}</p>
              <div className="flirt-quiz__rate-row">
                {currentStep.answers.map((option, idx) => (
                  <button
                    key={`rate-${idx}`}
                    type="button"
                    className={`flirt-quiz__rate ${pressedChoiceKey === `${currentStep.step}:rate-${option.answer}` ? "is-active" : ""}`.trim()}
                    onClick={() => selectSingle(option.answer, `rate-${option.answer}`)}
                  >
                    <img src={asset(pressedChoiceKey === `${currentStep.step}:rate-${option.answer}` ? option.svgIconActive : option.svgIcon)} alt={String(option.answer)} />
                  </button>
                ))}
              </div>
              <div className="flirt-quiz__rate-labels">
                <span>{uiCopy.rateLeft.split("\n")[0]}<br />{uiCopy.rateLeft.split("\n")[1]}</span>
                <span>{uiCopy.rateRight.split("\n")[0]}<br />{uiCopy.rateRight.split("\n")[1]}</span>
              </div>
            </div>
          ) : null}

          {currentStep.type === "slide" ? (
            <>
              <h1 className="flirt-quiz__title">{currentStep.question}</h1>
              <p className="flirt-quiz__statement">{currentStep.description}</p>
              <div className="flirt-quiz__slider-wrap">
                <div className="flirt-quiz__slider-values">
                  <span>0</span>
                  <span>5</span>
                  <span>10</span>
                </div>
                <div className="flirt-quiz__slider-control">
                  <div className="flirt-quiz__slider-track">
                    <span style={{ width: `${slidePercent}%` }} />
                  </div>
                  <span className="flirt-quiz__slider-thumb" style={{ left: `calc(${slidePercent}% - 17px)` }} />
                  <input
                    className="flirt-quiz__slider-input"
                    type="range"
                    min={0}
                    max={10}
                    value={slideDraft}
                    onChange={(event) => setSlideDraft(Number(event.target.value))}
                  />
                </div>
                <div className="flirt-quiz__slider-scale">
                  <span>{uiCopy.scaleMin}</span>
                  <span>{uiCopy.scaleMax}</span>
                </div>
              </div>
              <button
                type="button"
                className={`flirt-quiz__cta flirt-quiz__cta--slide ${pressedCtaKey === `${currentStep.step}:slide-continue` ? "is-pressed" : ""}`.trim()}
                onClick={() => runCtaAction("slide-continue", submitSlide)}
              >
                {uiCopy.continue}
              </button>
            </>
          ) : null}

          {currentStep.type === "prompt-1" ? (
            <section className="flirt-quiz__prompt">
              <h2>{i18nContent.prompt1.title}</h2>
              <p>{i18nContent.prompt1.subtitle}</p>
              <article className="flirt-quiz__trustpilot-card">
                <img src={asset("/icons/quiz/quiz-affemity-funnel/prompt-1-trustpilot-star.svg")} alt="" />
                <div>
                  <strong>4.6/5</strong>
                  <p>{i18nContent.prompt1.reviewsCount}</p>
                </div>
              </article>
              <picture>
                <source media="(max-width: 767px)" srcSet={asset("/images/quiz/quiz-affemity-funnel/prompt-1-mobiles-mobile.webp")} />
                <img src={asset("/images/quiz/quiz-affemity-funnel/prompt-1-mobiles.png")} alt="Prompt visual" className="flirt-quiz__prompt-image" />
              </picture>
              <button type="button" className={`flirt-quiz__cta ${pressedCtaKey === `${currentStep.step}:continue` ? "is-pressed" : ""}`.trim()} onClick={() => runCtaAction("continue", nextStep)}>{uiCopy.continue}</button>
            </section>
          ) : null}

          {currentStep.type === "prompt-2" ? (
            <section className="flirt-quiz__prompt flirt-quiz__prompt--before-after">
              <h2>{i18nContent.prompt2.title}</h2>
              <div className="flirt-quiz__result-block">
                <h3>{i18nContent.prompt7.primaryGoal}</h3>
                <div className="flirt-quiz__result-chip">
                  <img src={goalIcon(resultGoal)} alt="goal" />
                  <p>{resultGoal}</p>
                </div>
                <h3>{i18nContent.prompt7.desiredSkills}</h3>
                {resultSkills.map((item) => (
                  <div className="flirt-quiz__result-chip" key={item}>
                    <img src={skillIcon(item)} alt="skill" />
                    <p>{item}</p>
                  </div>
                ))}
              </div>
              <p>{i18nContent.prompt2.note}</p>
              <button type="button" className={`flirt-quiz__cta ${pressedCtaKey === `${currentStep.step}:continue` ? "is-pressed" : ""}`.trim()} onClick={() => runCtaAction("continue", nextStep)}>{uiCopy.continue}</button>
            </section>
          ) : null}

          {currentStep.type === "prompt-3" ? (
            <section className="flirt-quiz__prompt flirt-quiz__prompt--before-after-story">
              <h2>{i18nContent.prompt3.title}</h2>
              <p>{i18nContent.prompt3.subtitle}</p>
              <div className="flirt-quiz__before-after">
                <img className="flirt-quiz__before-after-arrow" src={asset("/icons/quiz/quiz-affemity-funnel/before-after-arrow.svg")} alt="" />
                <img className="flirt-quiz__before-after-arrow-down" src={asset("/icons/quiz/quiz-affemity-funnel/before-after-arrow-down.svg")} alt="" />
                <article className="flirt-quiz__before-after-card">
                  <h3>{i18nContent.prompt2.beforeTitle}</h3>
                  <ul>
                    <li><img src={asset("/icons/quiz/quiz-affemity-funnel/red-X.svg")} alt="" /><p>{i18nContent.prompt2.beforeItems[0]}</p></li>
                    <li><img src={asset("/icons/quiz/quiz-affemity-funnel/red-X.svg")} alt="" /><p>{i18nContent.prompt2.beforeItems[1]}</p></li>
                    <li><img src={asset("/icons/quiz/quiz-affemity-funnel/red-X.svg")} alt="" /><p>{i18nContent.prompt2.beforeItems[2]}</p></li>
                  </ul>
                </article>
                <article className="flirt-quiz__before-after-card">
                  <h3>{i18nContent.prompt2.afterTitle}</h3>
                  <ul>
                    <li><img src={asset("/icons/quiz/quiz-affemity-funnel/green-checkMark.svg")} alt="" /><p>{i18nContent.prompt2.afterItems[0]}</p></li>
                    <li><img src={asset("/icons/quiz/quiz-affemity-funnel/green-checkMark.svg")} alt="" /><p>{i18nContent.prompt2.afterItems[1]}</p></li>
                    <li><img src={asset("/icons/quiz/quiz-affemity-funnel/green-checkMark.svg")} alt="" /><p>{i18nContent.prompt2.afterItems[2]}</p></li>
                  </ul>
                </article>
              </div>
              <button type="button" className={`flirt-quiz__cta ${pressedCtaKey === `${currentStep.step}:continue` ? "is-pressed" : ""}`.trim()} onClick={() => runCtaAction("continue", nextStep)}>{uiCopy.continue}</button>
            </section>
          ) : null}

          {currentStep.type === "prompt-4" ? (
            <section className="flirt-quiz__prompt flirt-quiz__prompt--hero-review">
              <h2>{i18nContent.prompt4.title}</h2>
              <picture>
                <source media="(max-width: 767px)" srcSet={asset("/images/quiz/quiz-affemity-funnel/prompt-4-bg-mobile.webp")} />
                <img src={asset("/images/quiz/quiz-affemity-funnel/prompt-4-bg.webp")} alt="" className="flirt-quiz__prompt-image flirt-quiz__prompt-image--hero" />
              </picture>
              <div
                className="flirt-quiz__review-overlay"
              >
                <div
                  className="flirt-quiz__review-carousel"
                  ref={promptCarouselRef}
                  onScroll={(event) => {
                    const target = event.currentTarget;
                    if (!target.clientWidth) return;
                    if (promptJumpingRef.current) return;
                    const totalReviews = promptFourReviews.length;
                    const firstCard = target.querySelector<HTMLElement>(".flirt-quiz__review-card--carousel");
                    const styles = window.getComputedStyle(target);
                    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
                    const pageWidth = firstCard ? firstCard.offsetWidth + gap : target.clientWidth;
                    if (!pageWidth) return;
                    const nextIndex = Math.round(target.scrollLeft / pageWidth);
                    if (nextIndex <= 0) {
                      promptJumpingRef.current = true;
                      setPromptFourVirtualIndex(totalReviews);
                      target.scrollLeft = totalReviews * pageWidth;
                      window.requestAnimationFrame(() => {
                        promptJumpingRef.current = false;
                      });
                      return;
                    }
                    if (nextIndex >= totalReviews + 1) {
                      promptJumpingRef.current = true;
                      setPromptFourVirtualIndex(1);
                      target.scrollLeft = pageWidth;
                      window.requestAnimationFrame(() => {
                        promptJumpingRef.current = false;
                      });
                      return;
                    }
                    if (nextIndex !== promptFourVirtualIndex) setPromptFourVirtualIndex(nextIndex);
                  }}
                >
                  <div
                    className="flirt-quiz__review-track"
                  >
                    {promptFourLoopedReviews.map((review, idx) => (
                      <article key={`${review.name}-${idx}`} className="flirt-quiz__review-card flirt-quiz__review-card--carousel">
                        <h3>{review.name}</h3>
                        <div className="flirt-quiz__review-rate">
                          <img src={asset("/icons/quiz/quiz-affemity-funnel/prompt-4-rating-stars.svg")} alt="rating" />
                          <span>{review.rating}</span>
                        </div>
                        <p>{review.text}</p>
                      </article>
                    ))}
                  </div>
                </div>
                <div className="flirt-quiz__review-dots">
                  {promptFourReviews.map((_, idx) => (
                    <button
                      key={`review-dot-${idx}`}
                      type="button"
                      className={`flirt-quiz__review-dot-btn ${idx === (((promptFourVirtualIndex - 1) % promptFourReviews.length) + promptFourReviews.length) % promptFourReviews.length ? "is-active" : ""}`.trim()}
                      onClick={() => setPromptReviewByIndex(idx)}
                      aria-label={`${i18nContent.ui.reviewAriaPrefix} ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
              <p className="flirt-quiz__prompt-note">{i18nContent.prompt4.note}</p>
              <button type="button" className={`flirt-quiz__cta ${pressedCtaKey === `${currentStep.step}:continue` ? "is-pressed" : ""}`.trim()} onClick={() => runCtaAction("continue", nextStep)}>{uiCopy.continue}</button>
            </section>
          ) : null}

          {currentStep.type === "prompt-5" ? (
            <section className="flirt-quiz__prompt">
              <h2>{ghosted === i18nContent.defaults.ghostedYes ? i18nContent.prompt5.titleSad : i18nContent.prompt5.titlePositive}</h2>
              <p>
                {ghosted === i18nContent.defaults.ghostedYes ? i18nContent.prompt5.subtitleSad : i18nContent.prompt5.subtitlePositive}
              </p>
              <picture>
                <source media="(max-width: 767px)" srcSet={asset("/icons/quiz/quiz-affemity-funnel/prompt-5-chat-mobile.svg")} />
                <img src={asset("/icons/quiz/quiz-affemity-funnel/prompt-5-chat.svg")} alt="chat" className="flirt-quiz__prompt-chat" />
              </picture>
              <button type="button" className={`flirt-quiz__cta ${pressedCtaKey === `${currentStep.step}:continue` ? "is-pressed" : ""}`.trim()} onClick={() => runCtaAction("continue", nextStep)}>{uiCopy.continue}</button>
            </section>
          ) : null}

          {currentStep.type === "prompt-6" ? (
            <section className="flirt-quiz__prompt">
              <h2>{i18nContent.prompt6.title}</h2>
              <p>{i18nContent.prompt6.subtitle}</p>
              <ul className="flirt-quiz__list">
                <li>{i18nContent.prompt6.list[0]}</li>
                <li>{i18nContent.prompt6.list[1]}</li>
                <li>{i18nContent.prompt6.list[2]}</li>
              </ul>
              <picture>
                <source media="(max-width: 767px)" srcSet={asset("/images/quiz/quiz-affemity-funnel/prompt-6-img-mobile.webp")} />
                <img src={asset("/images/quiz/quiz-affemity-funnel/prompt-6-img.webp")} alt="prompt 6" className="flirt-quiz__prompt-image flirt-quiz__prompt-image--fullbleed" />
              </picture>
              <button type="button" className={`flirt-quiz__cta flirt-quiz__cta--on-image ${pressedCtaKey === `${currentStep.step}:continue` ? "is-pressed" : ""}`.trim()} onClick={() => runCtaAction("continue", nextStep)}>{uiCopy.continue}</button>
            </section>
          ) : null}

          {currentStep.type === "prompt-7" ? (
            <section className="flirt-quiz__prompt flirt-quiz__result-preview">
              <h2>{i18nContent.prompt7.title}</h2>
              <p>{i18nContent.prompt7.subtitle}</p>
              <p className="flirt-quiz__subtitle">{uiCopy.profilePotential}</p>
              <div className="flirt-quiz__potential">
                <div
                  className="flirt-quiz__potential-line"
                  style={{ "--potential-pos": `${potentialMarkerPos}%` } as CSSProperties}
                >
                  <span />
                  <img src={asset("/icons/quiz/quiz-affemity-funnel/prompt-7-triangle.svg")} alt="pointer" />
                </div>
                <div className="flirt-quiz__potential-labels">
                  <span>{i18nContent.prompt7.potentialLabels[0]}</span>
                  <span>{i18nContent.prompt7.potentialLabels[1]}</span>
                  <span>{i18nContent.prompt7.potentialLabels[2]}</span>
                  <span>{i18nContent.prompt7.potentialLabels[3]}</span>
                </div>
              </div>
              <div className="flirt-quiz__result-block">
                <h3>{i18nContent.prompt7.primaryGoal}</h3>
                <div className="flirt-quiz__result-chip">
                  <img src={goalIcon(resultGoal)} alt="goal" />
                  <p>{resultGoal}</p>
                </div>
                <h3>{i18nContent.prompt7.desiredSkills}</h3>
                {resultSkills.map((item) => (
                  <div className="flirt-quiz__result-chip" key={item}>
                    <img src={skillIcon(item)} alt="skill" />
                    <p>{item}</p>
                  </div>
                ))}
                <h3>{i18nContent.prompt7.learningGoal}</h3>
                <div className="flirt-quiz__result-chip">
                  <img src={learnIcon(resultLearn)} alt="learning" />
                  <p>{resultLearn}</p>
                </div>
              </div>
              <button type="button" className={`flirt-quiz__cta ${pressedCtaKey === `${currentStep.step}:continue` ? "is-pressed" : ""}`.trim()} onClick={() => runCtaAction("continue", nextStep)}>{uiCopy.continue}</button>
            </section>
          ) : null}

          {currentStep.type === "calculating-screen" ? (
            <section className="flirt-quiz__prompt">
              <h2>{uiCopy.loadingPlan}</h2>
              <p className="flirt-quiz__subtitle">{uiCopy.profilePotential}</p>
              <div className="flirt-quiz__calc-bars">
                {i18nContent.calc.labels.map((label, idx) => (
                  <div key={label} className="flirt-quiz__calc-item">
                    <div className="flirt-quiz__calc-head">
                      <p>{label}</p>
                      <strong>{Math.round(calcProgress[idx])}%</strong>
                    </div>
                    <div className="flirt-quiz__calc-track">
                      <span style={{ width: `${calcProgress[idx]}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div
                ref={calcCarouselRef}
                className="flirt-quiz__calc-reviews-swiper flirt-quiz__calc-reviews-swiper--auto"
                onScroll={(event) => {
                  if (calcJumpingRef.current) return;
                  const target = event.currentTarget;
                  const firstCard = target.querySelector<HTMLElement>(".flirt-quiz__calc-review-card");
                  if (!firstCard) return;
                  const styles = window.getComputedStyle(target);
                  const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
                  const cardWidth = firstCard.offsetWidth + gap;
                  if (!cardWidth) return;
                  const total = calcReviews.length;
                  const maxVirtualRight = (total + 1) * cardWidth;
                  const nextIndex = Math.round(target.scrollLeft / cardWidth);
                  if (nextIndex <= 0) {
                    calcJumpingRef.current = true;
                    skipCalcSyncRef.current = true;
                    setCalcReviewIndex(total);
                    target.scrollLeft = total * cardWidth;
                    window.requestAnimationFrame(() => {
                      calcJumpingRef.current = false;
                    });
                    return;
                  }
                  if (target.scrollLeft >= maxVirtualRight || nextIndex >= total + 1) {
                    calcJumpingRef.current = true;
                    skipCalcSyncRef.current = true;
                    setCalcReviewIndex(1);
                    target.scrollLeft = cardWidth;
                    window.requestAnimationFrame(() => {
                      calcJumpingRef.current = false;
                    });
                    return;
                  }
                  if (nextIndex !== calcReviewIndex) {
                    setCalcReviewIndex(nextIndex);
                  }
                }}
              >
                {calcLoopedReviews.map((review, idx) => (
                  <article key={`${review.name}-${idx}`} className="flirt-quiz__review-card flirt-quiz__calc-review-card">
                    <div className="flirt-quiz__calc-review-head">
                      <h3>{review.name}</h3>
                      <div className="flirt-quiz__calc-review-rate">
                        {Array.from({ length: 5 }).map((_, starIdx) => (
                          <img key={`calc-star-${idx}-${starIdx}`} src={asset("/icons/quiz/quiz-affemity-funnel/calculating-screen-trustpilot-star.svg")} alt="" />
                        ))}
                        <span>{review.rating}</span>
                      </div>
                    </div>
                    <p>{review.text}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {currentStep.type === "result-screen" ? (
            <section className="flirt-quiz__prompt flirt-quiz__final">
              <h2>{i18nContent.final.title}</h2>
              <picture>
                <source media="(max-width: 767px)" srcSet={RESULT_SCREEN_DIAGRAM_SRC} />
                <img src={RESULT_SCREEN_DIAGRAM_SRC} alt="diagram" className="flirt-quiz__final-diagram" />
              </picture>
              <button type="button" className={`flirt-quiz__cta flirt-quiz__cta--floating-mobile ${pressedCtaKey === `${currentStep.step}:final-continue` ? "is-pressed" : ""}`.trim()} onClick={() => runCtaAction("final-continue", completeQuiz)}>
                {uiCopy.finalCta}
              </button>
            </section>
          ) : null}
        </section>
        <SiteFooter variant="quiz" />
      </section>
    </main>
  );
};
