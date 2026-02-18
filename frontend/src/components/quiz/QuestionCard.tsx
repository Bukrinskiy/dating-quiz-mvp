import { AnswerButton } from "./AnswerButton";

type QuestionCardProps = {
  title: string;
  options: string[];
  selectedOption: number | null;
  transitioning: boolean;
  completed?: boolean;
  onSelect: (index: number) => void;
  stateClassName?: string;
};

export const QuestionCard = ({
  title,
  options,
  selectedOption,
  transitioning,
  completed = false,
  onSelect,
  stateClassName,
}: QuestionCardProps) => {
  const classes = `question-item ${stateClassName ?? ""} ${completed ? "is-readonly" : ""}`.trim();

  return (
    <article className={classes}>
      <h2>{title}</h2>
      {options.map((option, index) => (
        <AnswerButton
          key={option}
          text={option}
          selected={selectedOption === index}
          disabled={transitioning || completed}
          onClick={() => onSelect(index)}
        />
      ))}
    </article>
  );
};
