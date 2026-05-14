// Default no-op event adapter.
// Wire up a real emitter implementation here when needed —
// do not add an external dependency to enable this.

export interface EventPayload {
  eventName: string;
  payload: Record<string, unknown>;
}

export async function emitEvent(_event: EventPayload): Promise<void> {
  // no-op
}
