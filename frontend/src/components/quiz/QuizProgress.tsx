type QuizProgressProps = {
  currentBlock: number;
  totalBlocks?: number;
  completed?: boolean;
  questionCurrent?: number;
  questionTotal?: number;
};

export const QuizProgress = ({
  currentBlock,
  totalBlocks = 5,
  completed = false,
  questionCurrent = 1,
  questionTotal = 1,
}: QuizProgressProps) => {
  const safeQuestionTotal = Math.max(1, questionTotal);
  const safeQuestionCurrent = Math.max(1, Math.min(safeQuestionTotal, questionCurrent));
  const activeFillPercent = completed ? 100 : (safeQuestionCurrent / safeQuestionTotal) * 100;

  return (
    <div className="quiz-ux-progress" style={{ ["--segments" as string]: String(totalBlocks) }} aria-hidden="true">
      {Array.from({ length: totalBlocks }, (_, index) => {
        const isCompleted = index < currentBlock;
        const isActive = !completed && index === currentBlock;
        const fillPercent = isCompleted ? 100 : index === currentBlock ? activeFillPercent : 0;

        return (
          <span
            key={index}
            className={`quiz-ux-progress__segment ${isCompleted ? "is-completed" : ""} ${isActive ? "is-active" : ""}`}
          >
            <span className="quiz-ux-progress__segment-fill" style={{ width: `${fillPercent}%` }} />
          </span>
        );
      })}
    </div>
  );
};
