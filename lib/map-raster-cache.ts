type Entry = { url: string; size: number; expires: number };

export class MapRasterCache {
  private entries = new Map<string, Entry>();
  private bytes = 0;

  get(key: string, now = Date.now()) {
    const entry = this.entries.get(key);
    if (!entry) return;
    if (entry.expires <= now) {
      this.remove(key, entry);
      return;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.url;
  }

  store(key: string, blob: Blob, now = Date.now()) {
    const previous = this.entries.get(key);
    if (previous) this.remove(key, previous);
    const url = URL.createObjectURL(blob);
    this.entries.set(key, { url, size: blob.size, expires: now + 5 * 60_000 });
    this.bytes += blob.size;
    for (const [oldKey, entry] of this.entries) {
      if (this.entries.size <= 1 || (this.entries.size <= 8 && this.bytes <= 8 * 1024 * 1024)) break;
      this.remove(oldKey, entry);
    }
    return url;
  }

  clear() {
    for (const [key, entry] of this.entries) this.remove(key, entry);
  }

  private remove(key: string, entry: Entry) {
    URL.revokeObjectURL(entry.url);
    this.entries.delete(key);
    this.bytes -= entry.size;
  }
}
