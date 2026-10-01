/** Repository for bundled content, SQLite library state, and durable offline files. */
export class PackRepositoryImpl {
  constructor(content, meta, offlineStorage) {
    this.content = content;
    this.meta = meta;
    this.offlineStorage = offlineStorage;
  }
  listManifests = () => {
    return this.content.listManifests();
  };
  getBundledPack = id => {
    return this.content.get(id);
  };
  getSavedPack = async id => {
    const saved = await this.meta.get(id);
    if (!saved) return null;
    const pack = await this.content.get(id);
    if (pack && this.offlineStorage) {
      const status = await (this.offlineStorage.ensureReady?.(id)
        ?? this.offlineStorage.getStatus(id));
      if (!status) {
        await this.offlineStorage.savePack(pack);
      }
    }
    return pack;
  };
  listSavedMeta = async () => {
    return this.meta.list();
  };
  getSavedMeta = async id => {
    return this.meta.get(id);
  };
  savePack = async id => {
    const pack = await this.content.get(id);
    if (!pack) throw new Error('This destination pack is not bundled with the app yet.');
    const previousMeta = await this.meta.get(id);
    if (this.offlineStorage) {
      await this.offlineStorage.savePack(pack);
    }
    try {
      await this.meta.upsert({
        packId: pack.id,
        version: pack.version,
        updatedAt: pack.updatedAt,
        savedAt: Date.now()
      });
    } catch (error) {
      // A failed first save should leave no orphaned files. During an update,
      // keep the refreshed files so the older SQLite marker can be retried safely.
      if (!previousMeta) {
        await this.offlineStorage?.removePack(pack.id);
      }
      throw error;
    }
    return pack;
  };
  removePack = async id => {
    await this.meta.remove(id);
    await this.offlineStorage?.removePack(id);
  };
  getOfflineBundleStatus = async id => {
    return this.offlineStorage?.getStatus(id) ?? null;
  };
  ensureOfflineBundleReady = async id => {
    return this.offlineStorage?.ensureReady?.(id)
      ?? this.offlineStorage?.getStatus(id)
      ?? null;
  };
  getOfflineBasemapStatus = async () => {
    return this.offlineStorage?.getBasemapStatus?.() ?? null;
  };
  ensureOfflineBasemapReady = async () => {
    return this.offlineStorage?.ensureBasemapReady?.()
      ?? this.offlineStorage?.getBasemapStatus?.()
      ?? null;
  };
}
