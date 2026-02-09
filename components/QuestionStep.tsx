'use client';

import Link from 'next/link';
import { track } from '@/lib/analytics';

type Option = {
  label: string;
  value: string;
};

type QuestionStepProps = {
  stepNumber: number;
  nextHref: string;
  question: string;
  options: Option[];
};

export default function QuestionStep({ stepNumber, nextHref, question, options }: QuestionStepProps) {
  const answerEventName = `quiz_answer_${stepNumber}`;

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{question}</h1>

      <div className="space-y-3">
        {options.map((option) => (
          <Link
            key={option.value}
            href={nextHref}
            onClick={() => track(answerEventName, { answer: option.value })}
            className="block rounded-2xl border border-zinc-700 bg-zinc-900/60 px-5 py-4 text-lg font-medium transition hover:border-accent hover:bg-zinc-900"
          >
            {option.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
