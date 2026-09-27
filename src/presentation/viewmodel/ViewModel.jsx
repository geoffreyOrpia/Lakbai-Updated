/**
 * Observable base class for view models (the "VM" in MVVM).
 * Subclasses hold immutable state snapshots and call setState to publish.
 * Views bind through useSyncExternalStore, so updates are render-safe.
 */
export class ViewModel {
  listeners = new Set();
  currentState;
  constructor(initialState) {
    this.currentState = initialState;
  }
  get state() {
    return this.currentState;
  }

  /** Stable snapshot getter for useSyncExternalStore. */
  getState = () => this.currentState;

  /** Stable subscription for useSyncExternalStore. */
  subscribe = listener => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  setState = patch => {
    const next = typeof patch === 'function' ? patch(this.currentState) : patch;
    this.currentState = {
      ...this.currentState,
      ...next
    };
    this.listeners.forEach(listener => listener());
  };
  /** Hook for subclasses: called once when the bound view mounts. */
  /** Hook for subclasses: called once when the bound view unmounts. */
  /** @internal Called by useViewModel. */
  __initOnce = () => {
    this.onInit?.();
  };
}
