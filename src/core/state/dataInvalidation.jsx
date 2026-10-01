let sequence = 0;
const revisions = new Map();
const listeners = new Set();

export const markDataChanged = (...domains) => {
  if (!domains.length) return sequence;
  sequence += 1;
  for (const domain of domains) revisions.set(domain, sequence);
  for (const listener of listeners) listener();
  return sequence;
};

export const getDataRevision = domains => (
  (domains ?? []).reduce(
    (latest, domain) => Math.max(latest, revisions.get(domain) ?? 0),
    0,
  )
);

export const subscribeDataChanges = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
