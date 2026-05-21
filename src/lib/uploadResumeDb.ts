import type { Id } from "@convex/_generated/dataModel";

const DB_NAME = "lawn-upload-resume";
const DB_VERSION = 1;
const STORE_NAME = "sessions";

export type MultipartUploadResumeSession = {
  videoId: Id<"videos">;
  fileName: string;
  fileSize: number;
  fileLastModified: number;
  fileFingerprint: string;
  strategy: "multipart";
  uploadId: string;
  s3Key: string;
  partSizeBytes: number;
  partCount: number;
  completedParts: Array<{ partNumber: number; etag: string }>;
  updatedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Failed to open upload resume DB"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "videoId" });
        store.createIndex("by_fingerprint", "fileFingerprint", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        let closed = false;
        const closeDb = () => {
          if (closed) return;
          closed = true;
          db.close();
        };

        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = run(store);
        request.onerror = () => {
          closeDb();
          reject(request.error ?? new Error("Upload resume DB request failed"));
        };
        request.onsuccess = () => resolve(request.result as T);
        transaction.oncomplete = () => closeDb();
        transaction.onerror = () => {
          closeDb();
          reject(transaction.error ?? new Error("Upload resume DB transaction failed"));
        };
      }),
  );
}

export async function saveUploadResumeSession(session: MultipartUploadResumeSession) {
  try {
    await runTransaction("readwrite", (store) =>
      store.put({ ...session, updatedAt: Date.now() }),
    );
  } catch {
    // Resume persistence is best-effort and must not block uploads.
  }
}

export async function loadUploadResumeSession(videoId: Id<"videos">) {
  try {
    return await runTransaction<MultipartUploadResumeSession | undefined>("readonly", (store) =>
      store.get(videoId),
    );
  } catch {
    return undefined;
  }
}

export async function deleteUploadResumeSession(videoId: Id<"videos">) {
  try {
    await runTransaction("readwrite", (store) => store.delete(videoId));
  } catch {
    // No-op when IndexedDB is unavailable.
  }
}

export async function findUploadResumeSessionByFingerprint(fingerprint: string) {
  try {
    const db = await openDb();
    return await new Promise<MultipartUploadResumeSession | undefined>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("by_fingerprint");
      const request = index.getAll(fingerprint);
      request.onerror = () => reject(request.error ?? new Error("Failed to query resume sessions"));
      request.onsuccess = () => {
        const sessions = (request.result as MultipartUploadResumeSession[] | undefined) ?? [];
        const latest = sessions.sort((a, b) => b.updatedAt - a.updatedAt)[0];
        resolve(latest);
        db.close();
      };
      transaction.onerror = () => {
        reject(transaction.error ?? new Error("Failed to query resume sessions"));
        db.close();
      };
    });
  } catch {
    return undefined;
  }
}
