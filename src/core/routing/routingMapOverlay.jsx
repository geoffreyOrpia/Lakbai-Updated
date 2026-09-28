// Snapping adds only two virtual nodes and a handful of edges. Keep the shared
// province index intact instead of copying its full Maps on every reroute.
export class RoutingMapOverlay {
  constructor(base) {
    this.base = base;
    this.overrides = new Map();
  }

  has(key) { return this.overrides.has(key) || this.base.has(key); }
  get(key) { return this.overrides.has(key) ? this.overrides.get(key) : this.base.get(key); }
  set(key, value) { this.overrides.set(key, value); return this; }
}
