import LayoutQuiz from '@/components/LayoutQuiz';
import ProgressBar from '@/components/ProgressBar';
import QuestionStep from '@/components/QuestionStep';
import TrackView from '@/components/TrackView';

export default function Quiz2Page() {
  return (
    <LayoutQuiz>
      <TrackView eventName="quiz_view_2" />
      <ProgressBar stepLabel="Шаг 2 из 7" current={2} total={7} />
      <QuestionStep
        stepNumber={2}
        nextHref="/quiz-3"
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
