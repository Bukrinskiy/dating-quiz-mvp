import LayoutQuiz from '@/components/LayoutQuiz';
import ProgressBar from '@/components/ProgressBar';
import QuestionStep from '@/components/QuestionStep';
import TrackView from '@/components/TrackView';

export default function Quiz4Page() {
  return (
    <LayoutQuiz>
      <TrackView eventName="quiz_view_4" />
      <ProgressBar stepLabel="Шаг 4 из 7" current={4} total={7} />
      <QuestionStep
        stepNumber={4}
        nextHref="/quiz-5"
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
