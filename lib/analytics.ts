export function track(eventName: string, payload?: Record<string, unknown>) {
  // TODO: connect real analytics provider
  console.log('[track]', eventName, payload ?? {});
}
