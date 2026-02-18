import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { QuestionCard } from "../components/quiz/QuestionCard";
import { QuizContinue } from "../components/quiz/QuizContinue";
import { QuizMicrocopy } from "../components/quiz/QuizMicrocopy";
import { QuizProgress } from "../components/quiz/QuizProgress";
import { useI18n } from "../features/i18n/I18nProvider";
import { addClickIdToPath } from "../shared/lib/clickid";
import { sendPostbackOnce } from "../shared/lib/tracking";
import { Container } from "../shared/ui/Container";
import { LanguageSwitcher } from "../shared/ui/LanguageSwitcher";
import { QuizCard } from "../shared/ui/QuizCard";
import { SiteFooter } from "../shared/ui/SiteFooter";
import { quizBlockMeta } from "./quizData";

const TRANSITION_MS = 230;

type QuizBlockPageProps = {
  blockId: 1 | 2 | 3 | 4 | 5;
};

export const QuizBlockPage = ({ blockId }: QuizBlockPageProps) => {
  const numericBlockId = blockId;
  const blockIndex = numericBlockId - 1;
  const { copy } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const blockContent = copy.quiz.blocks[blockIndex];
  const blockMeta = useMemo(() => quizBlockMeta.find((item) => item.id === numericBlockId), [numericBlockId]);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [questionStateClass, setQuestionStateClass] = useState("");
  const [introHidden, setIntroHidden] = useState(false);

  useEffect(() => {
    setQuestionIndex(0);
    setSelectedOption(null);
    setCompleted(false);
    setTransitioning(false);
    setQuestionStateClass("");
    setIntroHidden(false);
  }, [numericBlockId]);

  if (!blockMeta || !blockContent) {
    return <Navigate to="/" replace />;
  }

  const safeQuestionIndex = Math.min(questionIndex, blockContent.questions.length - 1);
  const question = blockContent.questions[safeQuestionIndex];

  const onSelect = (index: number) => {
    if (transitioning || completed) {
      return;
    }

    setSelectedOption(index);
    setIntroHidden(true);
    setTransitioning(true);
    setQuestionStateClass("quiz-ux-question-leave");

    window.setTimeout(() => {
      if (safeQuestionIndex < blockContent.questions.length - 1) {
        setQuestionIndex((prev) => prev + 1);
        setSelectedOption(null);
        setQuestionStateClass("quiz-ux-question-enter");

        window.setTimeout(() => {
          setQuestionStateClass("");
          setTransitioning(false);
        }, TRANSITION_MS);
        return;
      }

      setCompleted(true);
      setQuestionStateClass("");
      setTransitioning(false);
    }, TRANSITION_MS);
  };

  const onContinue = () => {
    sendPostbackOnce(blockMeta.postbackStatus, location.search);
    navigate(addClickIdToPath(blockMeta.nextPath, location.search));
  };

  return (
    <>
      <Container>
        <LanguageSwitcher />
        <QuizCard>
          <p className={`quiz-intro ${introHidden ? "hidden" : ""}`}>{blockContent.intro}</p>
          <QuizProgress
            currentBlock={blockIndex}
            completed={completed}
            questionCurrent={safeQuestionIndex + 1}
            questionTotal={blockContent.questions.length}
          />

          <QuestionCard
            title={question.title}
            options={question.options}
            selectedOption={selectedOption}
            transitioning={transitioning}
            completed={completed}
            onSelect={onSelect}
            stateClassName={questionStateClass}
          />

          {completed ? (
            <div className="quiz-complete-group">
              <QuizMicrocopy text={blockContent.microcopy} visible={completed} />
              <QuizContinue
                to={addClickIdToPath(blockMeta.nextPath, location.search)}
                visible={completed}
                label={copy.ui.continue}
                onClick={onContinue}
              />
            </div>
          ) : null}
        </QuizCard>
      </Container>
      <SiteFooter />
    </>
  );
};
