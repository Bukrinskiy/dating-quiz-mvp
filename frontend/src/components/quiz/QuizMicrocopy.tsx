type QuizMicrocopyProps = {
  text: string;
  visible: boolean;
};

export const QuizMicrocopy = ({ text, visible }: QuizMicrocopyProps) => {
  return <p className={`quiz-intro quiz-pattern-note ${visible ? "" : "hidden"}`}>{text}</p>;
};
