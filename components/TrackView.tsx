'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';

type TrackViewProps = {
  eventName: string;
  payload?: Record<string, unknown>;
};

export default function TrackView({ eventName, payload }: TrackViewProps) {
  useEffect(() => {
    track(eventName, payload);
  }, [eventName, payload]);

  return null;
}
