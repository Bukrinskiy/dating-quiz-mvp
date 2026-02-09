import LayoutQuiz from '@/components/LayoutQuiz';
import ProgressBar from '@/components/ProgressBar';
import QuestionStep from '@/components/QuestionStep';
import TrackView from '@/components/TrackView';

export default function Quiz5Page() {
  return (
    <LayoutQuiz>
      <TrackView eventName="quiz_view_5" />
      <ProgressBar stepLabel="Шаг 5 из 7" current={5} total={7} />
      <QuestionStep
        stepNumber={5}
        nextHref="/quiz-6"
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
