/** SQLite-only repository for bundled destination packs and library state. */
export class PackRepositoryImpl {
  constructor(content, meta) {
    this.content = content;
    this.meta = meta;
  }
  listManifests = () => {
    return this.content.listManifests();
  };
  getBundledPack = id => {
    return this.content.get(id);
  };
  getSavedPack = async id => {
    const saved = await this.meta.get(id);
    return saved ? this.content.get(id) : null;
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
    await this.meta.upsert({
      packId: pack.id,
      version: pack.version,
      updatedAt: pack.updatedAt,
      savedAt: Date.now()
    });
    return pack;
  };
  removePack = async id => {
    await this.meta.remove(id);
  };
}
