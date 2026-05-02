/** Persistencia de borrador por proyecto/capítulo/variación (IndexedDB con fallback a localStorage). */

const DB_NAME = "ai-writer-drafts";
const DB_VERSION = 1;
const STORE = "drafts";
const LS_FALLBACK_KEY = "ai-writer:draft-fallback-v1";

export type DraftKey = {
  projectId: string;
  chapterId: string;
  branchId: string | null;
};

export type DraftRecord = DraftKey & {
  content: string;
  baseVersionId: string;
  updatedAt: string;
};

type StoredRow = DraftRecord & { key: string };

export function draftStorageKey(k: DraftKey): string {
  return `${k.projectId}:${k.chapterId}:${k.branchId ?? ""}`;
}

function readLsMap(): Record<string, StoredRow> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LS_FALLBACK_KEY);
    if (!raw) return {};
    const j = JSON.parse(raw) as Record<string, StoredRow>;
    return j && typeof j === "object" ? j : {};
  } catch {
    return {};
  }
}

function writeLsMap(m: Record<string, StoredRow>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(m));
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => resolve(null);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" });
      }
    };
  });
}

async function idbPut(row: StoredRow): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB tx"));
    tx.objectStore(STORE).put(row);
  });
  db.close();
}

async function idbGet(key: string): Promise<StoredRow | null> {
  const db = await openDb();
  if (!db) return null;
  const row = await new Promise<StoredRow | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    tx.onerror = () => reject(tx.error ?? new Error("IDB tx"));
    const q = tx.objectStore(STORE).get(key);
    q.onsuccess = () => resolve((q.result as StoredRow | undefined) ?? null);
  });
  db.close();
  return row;
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB tx"));
    tx.objectStore(STORE).delete(key);
  });
  db.close();
}

/** Guarda borrador (sobrescribe la entrada de la misma clave compuesta). */
export async function saveDraft(record: DraftRecord): Promise<void> {
  if (typeof window === "undefined") return;
  const key = draftStorageKey(record);
  const row: StoredRow = { key, ...record };
  try {
    await idbPut(row);
  } catch {
    /* IDBase opcional; localStorage queda como respaldo */
  }
  const m = readLsMap();
  m[key] = row;
  writeLsMap(m);
}

function rowToRecord(row: StoredRow): DraftRecord {
  return {
    projectId: row.projectId,
    chapterId: row.chapterId,
    branchId: row.branchId,
    content: row.content,
    baseVersionId: row.baseVersionId,
    updatedAt: row.updatedAt,
  };
}

export async function loadDraft(key: DraftKey): Promise<DraftRecord | null> {
  if (typeof window === "undefined") return null;
  const k = draftStorageKey(key);
  try {
    const fromIdb = await idbGet(k);
    if (fromIdb) {
      return rowToRecord(fromIdb);
    }
  } catch {
    /* use LS */
  }
  const m = readLsMap();
  const row = m[k];
  if (!row) return null;
  return rowToRecord(row);
}

export async function clearDraft(key: DraftKey): Promise<void> {
  if (typeof window === "undefined") return;
  const k = draftStorageKey(key);
  try {
    await idbDelete(k);
  } catch {
    /* ignore */
  }
  const m = readLsMap();
  delete m[k];
  writeLsMap(m);
}

/** Borra todos los borradores de un proyecto (p. ej. reinicio local). */
export async function clearDraftsForProject(projectId: string): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openDb();
  if (db) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IDB tx"));
      const st = tx.objectStore(STORE);
      const q = st.openCursor();
      q.onsuccess = () => {
        const cur = q.result;
        if (!cur) return;
        const row = cur.value as StoredRow;
        if (row.projectId === projectId) {
          cur.delete();
        }
        cur.continue();
      };
    });
    db.close();
  }
  const m = readLsMap();
  for (const k of Object.keys(m)) {
    if (m[k]?.projectId === projectId) delete m[k];
  }
  writeLsMap(m);
}
