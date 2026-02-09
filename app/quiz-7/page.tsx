import Link from 'next/link';
import LayoutQuiz from '@/components/LayoutQuiz';
import ProgressBar from '@/components/ProgressBar';
import TrackView from '@/components/TrackView';
import { track } from '@/lib/analytics';

export default function Quiz7Page() {
  return (
    <LayoutQuiz>
      <TrackView eventName="paywall_view" />
      <ProgressBar stepLabel="Шаг 7 из 7" current={7} total={7} />
      <section className="space-y-6">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">TODO: headline</h1>
        <p className="text-zinc-300">TODO: price</p>
        <p className="text-zinc-400">TODO: guarantee email</p>
        <Link
          href="#"
          onClick={() => track('paywall_cta_click')}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-accent px-6 py-4 text-lg font-semibold text-zinc-950 transition hover:opacity-90"
        >
          TODO: CTA text
        </Link>
      </section>
    </LayoutQuiz>
  );
}
