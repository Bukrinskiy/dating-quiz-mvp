import LayoutQuiz from '@/components/LayoutQuiz';
import ProgressBar from '@/components/ProgressBar';
import QuestionStep from '@/components/QuestionStep';
import TrackView from '@/components/TrackView';

export default function Quiz3Page() {
  return (
    <LayoutQuiz>
      <TrackView eventName="quiz_view_3" />
      <ProgressBar stepLabel="Шаг 3 из 7" current={3} total={7} />
      <QuestionStep
        stepNumber={3}
        nextHref="/quiz-4"
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
