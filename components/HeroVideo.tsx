'use client';

import { useState } from 'react';

export default function HeroVideo() {
  const [showFallback, setShowFallback] = useState(false);

  if (showFallback) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-zinc-700 bg-gradient-to-br from-zinc-900 via-zinc-800 to-cyan-900/40 p-8 text-center text-zinc-200">
        TODO: video fallback
      </div>
    );
  }

  return (
    <video
      autoPlay
      muted
      loop
      playsInline
      controls
      className="aspect-video w-full rounded-2xl border border-zinc-700 bg-black object-cover"
      onError={() => setShowFallback(true)}
    >
      <source src="/hero.mp4" type="video/mp4" />
    </video>
  );
}
