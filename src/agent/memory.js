/**
 * Memory Store — Mr. Stix never forgets.
 * Simple key-value with optional persistence to disk.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

export class MemoryStore {
  constructor(persistPath = null) {
    this.data = new Map();
    this.persistPath = persistPath || path.join(process.env.STIX_WORKING_DIR || ".", ".stix-memory.json");
    this._load();
  }

  store(key, value) {
    this.data.set(key, {
      value,
      timestamp: Date.now(),
      accessed: 0,
    });
    this._save();
    return true;
  }

  recall(key) {
    const entry = this.data.get(key);
    if (entry) {
      entry.accessed++;
      return entry.value;
    }
    return null;
  }

  search(query) {
    const results = [];
    const q = query.toLowerCase();
    for (const [key, entry] of this.data) {
      const valStr = typeof entry.value === "string" ? entry.value : JSON.stringify(entry.value);
      if (key.toLowerCase().includes(q) || valStr.toLowerCase().includes(q)) {
        results.push({ key, value: entry.value, relevance: key.toLowerCase().includes(q) ? 2 : 1 });
      }
    }
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  list() {
    return Array.from(this.data.keys());
  }

  clear() {
    this.data.clear();
    this._save();
  }

  _load() {
    try {
      if (existsSync(this.persistPath)) {
        const raw = readFileSync(this.persistPath, "utf-8");
        const parsed = JSON.parse(raw);
        for (const [key, val] of Object.entries(parsed)) {
          this.data.set(key, val);
        }
      }
    } catch (e) {
      // Fresh start. Mr. Stix adapts.
    }
  }

  _save() {
    try {
      const dir = path.dirname(this.persistPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const obj = {};
      for (const [key, val] of this.data) {
        obj[key] = val;
      }
      writeFileSync(this.persistPath, JSON.stringify(obj, null, 2));
    } catch (e) {
      // Persistence failed. Mr. Stix continues regardless.
    }
  }
}

export default MemoryStore;
