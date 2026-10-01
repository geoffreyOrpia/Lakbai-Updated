// A versioned, shared file is promoted only after its bytes match the manifest.
// Failed updates do not touch earlier versions; concurrent saves share one copy.
export const createSharedRoutingStore = ({ referenceFor, fileFor, prepareDirectory, materialize }) => {
  const inFlight = new Map();
  const referenceForRead = (region, savedReference = null) => {
    const current = referenceFor(region);
    const reference = savedReference ?? current;
    // A previous pack may retain an older checked dataset after a failed update.
    // Validate its path components before consulting the shared file store.
    if (savedReference && (!current || reference.datasetId !== current.datasetId
      || reference.regionId !== region || !/^[a-zA-Z0-9_-]+$/.test(reference.version)
      || !/^[a-f0-9]{32}$/.test(reference.md5) || !(reference.bytes > 0))) return null;
    return reference ?? null;
  };
  const peek = (region, savedReference = null) => {
    const reference = referenceForRead(region, savedReference);
    if (!reference) return null;
    const file = fileFor(reference, false);
    if (!file.exists || file.size !== reference.bytes) return null;
    return { uri: file.uri, sizeBytes: file.size, reference };
  };
  const status = (region, savedReference = null) => {
    const result = peek(region, savedReference);
    if (!result) return null;
    const file = fileFor(result.reference, false);
    if (file.md5 !== result.reference.md5) return null;
    return result;
  };
  const ensure = region => {
    if (inFlight.has(region)) return inFlight.get(region);
    const task = (async () => {
      const existing = status(region);
      if (existing) return existing;
      const reference = referenceFor(region);
      if (!reference) throw new Error('No routing dataset for this region');
      prepareDirectory(reference);
      const temporary = fileFor(reference, true);
      if (temporary.exists) temporary.delete();
      try {
        await materialize(region, temporary);
        if (!temporary.exists || temporary.size !== reference.bytes || temporary.md5 !== reference.md5) {
          throw new Error('Routing data integrity check failed. Retry saving the pack.');
        }
        const destination = fileFor(reference, false);
        if (destination.exists) destination.delete(); // only a corrupt copy of this exact version
        temporary.move(destination);
        const result = status(region);
        if (!result) throw new Error('Routing data could not be installed');
        return result;
      } finally {
        // move() mutates File.uri, so resolve the staging name again.
        const remaining = fileFor(reference, true);
        if (remaining.exists) remaining.delete();
      }
    })();
    inFlight.set(region, task);
    task.finally(() => inFlight.delete(region)).catch(() => {});
    return task;
  };
  return { peek, status, ensure };
};
