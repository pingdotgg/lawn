import type { Id } from "@convex/_generated/dataModel";

const DB_NAME = "lawn-upload-resume";
const DB_VERSION = 1;
const STORE_NAME = "sessions";
const RESUME_SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export type UploadCreationIntent =
  | {
      kind: "standalone";
      projectId: Id<"projects">;
    }
  | {
      kind: "version";
      sourceVideoId: Id<"videos">;
      versionStackId: Id<"videos">;
    };

type UploadResumeIntent =
  | {
      kind: "standalone";
      projectId: Id<"projects">;
    }
  | {
      kind: "version";
      versionStackId?: Id<"videos">;
      sourceVideoId?: Id<"videos">;
    };

export type MultipartUploadResumeSession = {
  videoId: Id<"videos">;
  creationIntent?: UploadResumeIntent;
  // Legacy sessions predate explicit creation intents and are standalone.
  projectId?: Id<"projects">;
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

function getSessionCreationIntent(
  session: MultipartUploadResumeSession,
): UploadResumeIntent | undefined {
  if (session.creationIntent) {
    return session.creationIntent;
  }
  if (session.projectId) {
    return { kind: "standalone", projectId: session.projectId };
  }
  return undefined;
}

export function uploadCreationIntentsMatch(
  session: MultipartUploadResumeSession,
  intent: UploadCreationIntent,
) {
  const sessionIntent = getSessionCreationIntent(session);
  if (!sessionIntent || sessionIntent.kind !== intent.kind) {
    return false;
  }
  if (intent.kind === "standalone") {
    return sessionIntent.kind === "standalone" && sessionIntent.projectId === intent.projectId;
  }
  if (sessionIntent.kind !== "version") {
    return false;
  }
  if (sessionIntent.versionStackId) {
    return sessionIntent.versionStackId === intent.versionStackId;
  }
  return sessionIntent.sourceVideoId === intent.sourceVideoId;
}

export function getUploadResumeIntent(intent: UploadCreationIntent): UploadResumeIntent {
  if (intent.kind === "standalone") {
    return intent;
  }
  return {
    kind: "version",
    versionStackId: intent.versionStackId,
  };
}

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
        let settled = false;
        let result: T;
        const closeDb = () => {
          if (closed) return;
          closed = true;
          db.close();
        };
        const rejectOnce = (error: Error) => {
          if (settled) return;
          settled = true;
          closeDb();
          reject(error);
        };

        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = run(store);
        request.onerror = () => {
          rejectOnce(request.error ?? new Error("Upload resume DB request failed"));
        };
        request.onsuccess = () => {
          result = request.result as T;
        };
        transaction.oncomplete = () => {
          if (settled) return;
          settled = true;
          closeDb();
          resolve(result);
        };
        transaction.onerror = () => {
          rejectOnce(transaction.error ?? new Error("Upload resume DB transaction failed"));
        };
        transaction.onabort = () => {
          rejectOnce(transaction.error ?? new Error("Upload resume DB transaction aborted"));
        };
      }),
  );
}

export async function saveUploadResumeSession(session: MultipartUploadResumeSession) {
  try {
    await runTransaction("readwrite", (store) => store.put({ ...session, updatedAt: Date.now() }));
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

export async function findUploadResumeSessionByFingerprint(
  fingerprint: string,
  intent: UploadCreationIntent,
) {
  try {
    const allSessions = await runTransaction<MultipartUploadResumeSession[]>("readonly", (store) =>
      store.getAll(),
    );
    const cutoff = Date.now() - RESUME_SESSION_MAX_AGE_MS;
    await Promise.all(
      allSessions
        .filter((session) => session.updatedAt < cutoff)
        .map((session) => deleteUploadResumeSession(session.videoId)),
    );
    const sessions = await runTransaction<MultipartUploadResumeSession[]>("readonly", (store) =>
      store.index("by_fingerprint").getAll(fingerprint),
    );
    return sessions
      .filter((session) => session.updatedAt >= cutoff)
      .filter((session) => uploadCreationIntentsMatch(session, intent))
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  } catch {
    return undefined;
  }
}
