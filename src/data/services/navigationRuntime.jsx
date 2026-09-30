const listeners = new Set();

export const subscribeNavigationRuntime = listener => {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const emitNavigationRuntime = event => {
  for (const listener of [...listeners]) {
    try {
      listener(event);
    } catch {
      // One screen subscriber must not prevent navigation from continuing.
    }
  }
};
