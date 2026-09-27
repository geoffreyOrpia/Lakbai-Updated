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
  getDownloadedPack = async id => {
    const saved = await this.meta.get(id);
    return saved ? this.content.get(id) : null;
  };
  listDownloadedMeta = async () => {
    return this.meta.list();
  };
  getDownloadedMeta = async id => {
    return this.meta.get(id);
  };
  downloadPack = async id => {
    const pack = await this.content.get(id);
    if (!pack) throw new Error('This destination pack is not bundled with the app yet.');
    await this.meta.upsert({
      packId: pack.id,
      version: pack.version,
      updatedAt: pack.updatedAt,
      downloadedAt: Date.now()
    });
    return pack;
  };
  removePack = async id => {
    await this.meta.remove(id);
  };
}
