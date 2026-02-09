import Link from 'next/link';
import HeroVideo from '@/components/HeroVideo';
import LayoutQuiz from '@/components/LayoutQuiz';
import ProgressBar from '@/components/ProgressBar';
import TrackView from '@/components/TrackView';
import { track } from '@/lib/analytics';

export default function Quiz0Page() {
  return (
    <LayoutQuiz>
      <TrackView eventName="hero_view" />
      <ProgressBar stepLabel="Старт" />

      <section className="space-y-6">
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">TODO: headline</h1>
        <HeroVideo />
        <p className="text-zinc-300">TODO: headline</p>
        <Link
          href="/quiz-1"
          onClick={() => track('hero_cta_click')}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-accent px-6 py-4 text-lg font-semibold text-zinc-950 transition hover:opacity-90"
        >
          TODO: CTA text
        </Link>
      </section>
    </LayoutQuiz>
  );
}
