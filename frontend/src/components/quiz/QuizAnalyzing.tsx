import { useEffect } from "react";

const ANALYZING_DURATION_MS = 2500;

type QuizAnalyzingProps = {
  text: string;
  visible: boolean;
  onComplete: () => void;
};

export const QuizAnalyzing = ({ text, visible, onComplete }: QuizAnalyzingProps) => {
  useEffect(() => {
    if (!visible) return;

    const timer = window.setTimeout(onComplete, ANALYZING_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [visible, onComplete]);

  if (!visible) return null;

  return (
    <div className="quiz-analyzing">
      <p className="quiz-analyzing__text">{text}</p>
      <div className="quiz-analyzing__track">
        <div className="quiz-analyzing__bar" />
      </div>
    </div>
  );
};
