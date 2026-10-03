import "server-only";

const listeners = new Set<() => void>();
let generation = 0;

export function contentGeneration() {
  return generation;
}

export function notifyContentUpdated() {
  generation += 1;
  listeners.forEach((listener) => listener());
}

export function subscribeContentUpdates(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
