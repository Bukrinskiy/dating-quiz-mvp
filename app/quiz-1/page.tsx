import LayoutQuiz from '@/components/LayoutQuiz';
import ProgressBar from '@/components/ProgressBar';
import QuestionStep from '@/components/QuestionStep';
import TrackView from '@/components/TrackView';

export default function Quiz1Page() {
  return (
    <LayoutQuiz>
      <TrackView eventName="quiz_view_1" />
      <ProgressBar stepLabel="Шаг 1 из 7" current={1} total={7} />
      <QuestionStep
        stepNumber={1}
        nextHref="/quiz-2"
        question="TODO: question"
        options={[
          { label: 'TODO: option A', value: 'A' },
          { label: 'TODO: option B', value: 'B' },
          { label: 'TODO: option C', value: 'C' },
          { label: 'TODO: option D', value: 'D' }
        ]}
      />
    </LayoutQuiz>
  );
}
