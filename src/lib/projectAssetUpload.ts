import type { Id } from "@convex/_generated/dataModel";
import {
  MAX_SIGN_PARTS_BATCH,
  MULTIPART_UPLOAD_CONCURRENCY,
  formatMaxUploadSize,
  isFileTooLarge,
} from "@/lib/uploadLimits";
import { resolveProjectAssetContentType } from "@/lib/projectAssetTypes";
import { ResumableUploadError } from "@/lib/videoUpload";

export type AssetUploadProgressUpdate = {
  progress: number;
  bytesPerSecond?: number;
  estimatedSecondsRemaining?: number | null;
};

type UploadedPart = { partNumber: number; etag: string };

type InitiateSingle = {
  strategy: "single";
  url: string;
  key: string;
};

type InitiateMultipart = {
  strategy: "multipart";
  key: string;
  uploadId: string;
  partSizeBytes: number;
  partCount: number;
  uploadedParts: UploadedPart[];
};

export type InitiateAssetUploadResult = InitiateSingle | InitiateMultipart;

export type ProjectAssetUploadActions = {
  initiateAssetUpload: (args: {
    assetId: Id<"projectAssets">;
    filename: string;
    fileSize: number;
    contentType: string;
  }) => Promise<InitiateAssetUploadResult>;
  signAssetUploadParts: (args: {
    assetId: Id<"projectAssets">;
    partNumbers: number[];
  }) => Promise<{ parts: Array<{ partNumber: number; url: string }> }>;
  completeAssetMultipartUpload: (args: {
    assetId: Id<"projectAssets">;
    parts: UploadedPart[];
  }) => Promise<{ success: boolean }>;
  markAssetUploadComplete: (args: {
    assetId: Id<"projectAssets">;
  }) => Promise<{ success: boolean }>;
};

class UploadPartError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "UploadPartError";
  }
}

const MAX_PART_UPLOAD_ATTEMPTS = 4;
const PART_RETRY_BASE_DELAY_MS = 500;

function normalizeEtag(etag: string) {
  return etag.trim().replaceAll('"', "");
}

function uploadPartWithXhr(
  url: string,
  blob: Blob,
  signal: AbortSignal,
  onProgress: (loaded: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;

    const cleanup = () => {
      signal.removeEventListener("abort", onAbort);
    };
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const onAbort = () => {
      xhr.abort();
      rejectOnce(new Error("Upload cancelled"));
    };

    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || settled) return;
      onProgress(event.loaded);
    });

    xhr.addEventListener("load", () => {
      if (settled) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag");
        if (!etag) {
          rejectOnce(new Error("Upload part succeeded but no ETag was returned."));
          return;
        }
        settled = true;
        cleanup();
        resolve(normalizeEtag(etag));
        return;
      }
      rejectOnce(
        new UploadPartError(`Upload part failed: ${xhr.status} ${xhr.statusText}`, xhr.status),
      );
    });

    xhr.addEventListener("error", () => {
      rejectOnce(new UploadPartError("Upload part failed: Network error"));
    });

    xhr.addEventListener("abort", () => {
      rejectOnce(new Error("Upload cancelled"));
    });

    xhr.open("PUT", url);
    xhr.send(blob);
  });
}

function waitForRetry(delayMs: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    const onAbort = () => {
      window.clearTimeout(timeout);
      reject(new Error("Upload cancelled"));
    };

    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function shouldRetryPartUpload(error: unknown) {
  if (!(error instanceof UploadPartError)) return false;
  return (
    error.status === undefined ||
    error.status === 403 ||
    error.status === 408 ||
    error.status === 429 ||
    error.status >= 500
  );
}

async function uploadPartWithRetry(args: {
  initialUrl: string;
  blob: Blob;
  partNumber: number;
  assetId: Id<"projectAssets">;
  actions: ProjectAssetUploadActions;
  signal: AbortSignal;
  onProgress: (loaded: number) => void;
}) {
  let url = args.initialUrl;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_PART_UPLOAD_ATTEMPTS; attempt += 1) {
    try {
      return await uploadPartWithXhr(url, args.blob, args.signal, args.onProgress);
    } catch (error) {
      lastError = error;
      if (
        args.signal.aborted ||
        !shouldRetryPartUpload(error) ||
        attempt === MAX_PART_UPLOAD_ATTEMPTS
      ) {
        throw error;
      }

      args.onProgress(0);
      if (error instanceof UploadPartError && error.status === 403) {
        const signed = await args.actions.signAssetUploadParts({
          assetId: args.assetId,
          partNumbers: [args.partNumber],
        });
        const replacement = signed.parts[0];
        if (!replacement) {
          throw new Error("Failed to refresh upload part URL.");
        }
        url = replacement.url;
      }

      const jitter = Math.floor(Math.random() * PART_RETRY_BASE_DELAY_MS);
      await waitForRetry(PART_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1) + jitter, args.signal);
    }
  }

  throw lastError;
}

function uploadSingleWithXhr(
  url: string,
  file: File,
  contentType: string,
  signal: AbortSignal,
  onProgress: (update: AssetUploadProgressUpdate) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let lastTime = Date.now();
    let lastLoaded = 0;
    const recentSpeeds: number[] = [];

    const onAbort = () => {
      xhr.abort();
      reject(new Error("Upload cancelled"));
    };

    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;

      const percentage = Math.round((event.loaded / event.total) * 100);
      const now = Date.now();
      const timeDelta = (now - lastTime) / 1000;
      const bytesDelta = event.loaded - lastLoaded;

      if (timeDelta > 0.1) {
        const speed = bytesDelta / timeDelta;
        recentSpeeds.push(speed);
        if (recentSpeeds.length > 5) recentSpeeds.shift();
        lastTime = now;
        lastLoaded = event.loaded;
      }

      const avgSpeed =
        recentSpeeds.length > 0
          ? recentSpeeds.reduce((sum, speed) => sum + speed, 0) / recentSpeeds.length
          : 0;
      const remaining = event.total - event.loaded;
      const eta = avgSpeed > 0 ? Math.ceil(remaining / avgSpeed) : null;

      onProgress({
        progress: percentage,
        bytesPerSecond: avgSpeed,
        estimatedSecondsRemaining: eta,
      });
    });

    xhr.addEventListener("load", () => {
      signal.removeEventListener("abort", onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress({ progress: 100, bytesPerSecond: 0, estimatedSecondsRemaining: 0 });
        resolve();
        return;
      }
      reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
    });

    xhr.addEventListener("error", () => {
      signal.removeEventListener("abort", onAbort);
      reject(new Error("Upload failed: Network error"));
    });

    xhr.addEventListener("abort", () => {
      signal.removeEventListener("abort", onAbort);
      reject(new Error("Upload cancelled"));
    });

    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.send(file);
  });
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function getPartByteRange(fileSize: number, partSizeBytes: number, partNumber: number) {
  const start = (partNumber - 1) * partSizeBytes;
  const end = Math.min(start + partSizeBytes, fileSize);
  return { start, end };
}

function mergeUploadedParts(...partGroups: UploadedPart[][]) {
  const merged = new Map<number, string>();
  for (const group of partGroups) {
    for (const part of group) {
      merged.set(part.partNumber, part.etag);
    }
  }
  return [...merged.entries()]
    .sort(([a], [b]) => a - b)
    .map(([partNumber, etag]) => ({ partNumber, etag }));
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  signal: AbortSignal,
  worker: (item: T, signal: AbortSignal) => Promise<void>,
) {
  let index = 0;
  let firstError: unknown;
  let hasError = false;
  const workerController = new AbortController();
  const abortWorkers = () => {
    workerController.abort(signal.reason);
  };
  if (signal.aborted) {
    abortWorkers();
  } else {
    signal.addEventListener("abort", abortWorkers, { once: true });
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (!workerController.signal.aborted && index < items.length) {
      const current = items[index]!;
      index += 1;
      try {
        await worker(current, workerController.signal);
      } catch (error) {
        if (!hasError) {
          hasError = true;
          firstError = error;
          workerController.abort(error);
        }
        return;
      }
    }
  });
  await Promise.all(runners);
  signal.removeEventListener("abort", abortWorkers);

  if (hasError) {
    throw firstError;
  }
  if (signal.aborted) {
    throw new Error("Upload cancelled");
  }
}

async function uploadMultipartFile(args: {
  file: File;
  assetId: Id<"projectAssets">;
  initiate: InitiateMultipart;
  actions: ProjectAssetUploadActions;
  signal: AbortSignal;
  onProgress: (update: AssetUploadProgressUpdate) => void;
}) {
  const { file, assetId, initiate, actions, signal, onProgress } = args;
  const completedParts = mergeUploadedParts(initiate.uploadedParts);
  const completedMap = new Map(completedParts.map((part) => [part.partNumber, part.etag] as const));

  const pendingPartNumbers = Array.from(
    { length: initiate.partCount },
    (_, index) => index + 1,
  ).filter((partNumber) => !completedMap.has(partNumber));

  let bytesUploaded = 0;
  for (const partNumber of completedMap.keys()) {
    const { start, end } = getPartByteRange(file.size, initiate.partSizeBytes, partNumber);
    bytesUploaded += end - start;
  }

  let lastTime = Date.now();
  let lastLoaded = bytesUploaded;
  let lastReportedAt = 0;
  const recentSpeeds: number[] = [];
  const inFlightLoaded = new Map<number, number>();

  const reportProgress = (force = false) => {
    const now = Date.now();
    if (!force && now - lastReportedAt < 100) return;
    lastReportedAt = now;

    const inFlightBytes = [...inFlightLoaded.values()].reduce((sum, loaded) => sum + loaded, 0);
    const totalLoaded = Math.min(file.size, bytesUploaded + inFlightBytes);
    const percentage = Math.min(100, Math.round((totalLoaded / file.size) * 100));
    const timeDelta = (now - lastTime) / 1000;
    const bytesDelta = totalLoaded - lastLoaded;
    if (timeDelta > 0.1) {
      const speed = Math.max(0, bytesDelta / timeDelta);
      recentSpeeds.push(speed);
      if (recentSpeeds.length > 5) recentSpeeds.shift();
      lastTime = now;
      lastLoaded = totalLoaded;
    }
    const avgSpeed =
      recentSpeeds.length > 0
        ? recentSpeeds.reduce((sum, speed) => sum + speed, 0) / recentSpeeds.length
        : 0;
    const remaining = file.size - totalLoaded;
    const eta = avgSpeed > 0 ? Math.ceil(remaining / avgSpeed) : null;
    onProgress({
      progress: percentage,
      bytesPerSecond: avgSpeed,
      estimatedSecondsRemaining: eta,
    });
  };

  reportProgress(true);

  const signBatches = chunkArray(pendingPartNumbers, MAX_SIGN_PARTS_BATCH);
  try {
    for (const signBatch of signBatches) {
      if (signBatch.length === 0) continue;

      const { parts: signedParts } = await actions.signAssetUploadParts({
        assetId,
        partNumbers: signBatch,
      });

      await runWithConcurrency(
        signedParts,
        MULTIPART_UPLOAD_CONCURRENCY,
        signal,
        async (signedPart, workerSignal) => {
          const { start, end } = getPartByteRange(
            file.size,
            initiate.partSizeBytes,
            signedPart.partNumber,
          );
          const blob = file.slice(start, end);
          inFlightLoaded.set(signedPart.partNumber, 0);
          try {
            const etag = await uploadPartWithRetry({
              initialUrl: signedPart.url,
              blob,
              partNumber: signedPart.partNumber,
              assetId,
              actions,
              signal: workerSignal,
              onProgress: (loaded) => {
                inFlightLoaded.set(signedPart.partNumber, loaded);
                reportProgress();
              },
            });
            completedMap.set(signedPart.partNumber, etag);
            bytesUploaded += end - start;
            inFlightLoaded.delete(signedPart.partNumber);
            reportProgress(true);
          } catch (error) {
            inFlightLoaded.delete(signedPart.partNumber);
            throw error;
          }
        },
      );
    }
  } catch (error) {
    throw new ResumableUploadError(error);
  }

  const parts = mergeUploadedParts(
    [...completedMap.entries()].map(([partNumber, etag]) => ({ partNumber, etag })),
  );
  await actions.completeAssetMultipartUpload({ assetId, parts });
  onProgress({ progress: 100, bytesPerSecond: 0, estimatedSecondsRemaining: 0 });
}

export async function uploadProjectAssetFile(args: {
  file: File;
  assetId: Id<"projectAssets">;
  actions: ProjectAssetUploadActions;
  signal: AbortSignal;
  onProgress: (update: AssetUploadProgressUpdate) => void;
}) {
  const { file, assetId, actions, signal, onProgress } = args;

  if (isFileTooLarge(file.size)) {
    throw new Error(`File is too large. Maximum size is ${formatMaxUploadSize()}.`);
  }

  const contentType =
    resolveProjectAssetContentType(file.name, file.type) ??
    (file.type || "application/octet-stream");

  const initiate = await actions.initiateAssetUpload({
    assetId,
    filename: file.name,
    fileSize: file.size,
    contentType,
  });

  if (initiate.strategy === "single") {
    try {
      await uploadSingleWithXhr(initiate.url, file, contentType, signal, onProgress);
    } catch (error) {
      throw new ResumableUploadError(error);
    }
  } else {
    await uploadMultipartFile({
      file,
      assetId,
      initiate,
      actions,
      signal,
      onProgress,
    });
  }

  await actions.markAssetUploadComplete({ assetId });
}
