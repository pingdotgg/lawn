import type { Id } from "@convex/_generated/dataModel";
import {
  MAX_SIGN_PARTS_BATCH,
  MULTIPART_UPLOAD_CONCURRENCY,
  buildFileFingerprint,
  formatMaxUploadSize,
  isFileTooLarge,
} from "@/lib/uploadLimits";
import {
  deleteUploadResumeSession,
  saveUploadResumeSession,
  type MultipartUploadResumeSession,
} from "@/lib/uploadResumeDb";

export type UploadProgressUpdate = {
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

type InitiateAlreadyUploaded = {
  strategy: "already_uploaded";
  key: string;
};

export type InitiateVideoUploadResult =
  | InitiateSingle
  | InitiateMultipart
  | InitiateAlreadyUploaded;

export type VideoUploadActions = {
  initiateVideoUpload: (args: {
    videoId: Id<"videos">;
    filename: string;
    fileSize: number;
    contentType: string;
  }) => Promise<InitiateVideoUploadResult>;
  signUploadParts: (args: {
    videoId: Id<"videos">;
    partNumbers: number[];
  }) => Promise<{ parts: Array<{ partNumber: number; url: string }> }>;
  completeMultipartUpload: (args: {
    videoId: Id<"videos">;
    parts: UploadedPart[];
  }) => Promise<{ success: boolean }>;
  markUploadComplete: (args: { videoId: Id<"videos"> }) => Promise<{ success: boolean }>;
};

function normalizeEtag(etag: string) {
  return etag.trim().replaceAll('"', "");
}

function uploadPartWithXhr(
  url: string,
  blob: Blob,
  signal: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    const onAbort = () => {
      xhr.abort();
      reject(new Error("Upload cancelled"));
    };

    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });

    xhr.addEventListener("load", () => {
      signal.removeEventListener("abort", onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag");
        if (!etag) {
          reject(new Error("Upload part succeeded but no ETag was returned."));
          return;
        }
        resolve(normalizeEtag(etag));
        return;
      }
      reject(new Error(`Upload part failed: ${xhr.status} ${xhr.statusText}`));
    });

    xhr.addEventListener("error", () => {
      signal.removeEventListener("abort", onAbort);
      reject(new Error("Upload part failed: Network error"));
    });

    xhr.addEventListener("abort", () => {
      signal.removeEventListener("abort", onAbort);
      reject(new Error("Upload cancelled"));
    });

    xhr.open("PUT", url);
    xhr.send(blob);
  });
}

function uploadSingleWithXhr(
  url: string,
  file: File,
  contentType: string,
  signal: AbortSignal,
  onProgress: (update: UploadProgressUpdate) => void,
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

function getPartByteRange(
  fileSize: number,
  partSizeBytes: number,
  partNumber: number,
) {
  const start = (partNumber - 1) * partSizeBytes;
  const end = Math.min(start + partSizeBytes, fileSize);
  return { start, end };
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  let index = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  });
  await Promise.all(runners);
}

async function persistResumeSession(session: MultipartUploadResumeSession) {
  await saveUploadResumeSession(session);
}

async function uploadMultipartFile(args: {
  file: File;
  videoId: Id<"videos">;
  contentType: string;
  initiate: InitiateMultipart;
  actions: VideoUploadActions;
  signal: AbortSignal;
  onProgress: (update: UploadProgressUpdate) => void;
  resumeSession?: MultipartUploadResumeSession;
}) {
  const { file, videoId, contentType, initiate, actions, signal, onProgress, resumeSession } =
    args;
  const completedParts = mergeUploadedParts(
    initiate.uploadedParts,
    resumeSession?.completedParts ?? [],
  );
  const completedMap = new Map(
    completedParts.map((part) => [part.partNumber, part.etag] as const),
  );

  const pendingPartNumbers = Array.from(
    { length: initiate.partCount },
    (_, index) => index + 1,
  ).filter((partNumber) => !completedMap.has(partNumber));

  let bytesUploaded = 0;
  for (const [partNumber, etag] of completedMap) {
    const { start, end } = getPartByteRange(file.size, initiate.partSizeBytes, partNumber);
    void etag;
    bytesUploaded += end - start;
  }

  let lastTime = Date.now();
  let lastLoaded = bytesUploaded;
  const recentSpeeds: number[] = [];

  const reportProgress = () => {
    const percentage = Math.min(100, Math.round((bytesUploaded / file.size) * 100));
    const now = Date.now();
    const timeDelta = (now - lastTime) / 1000;
    const bytesDelta = bytesUploaded - lastLoaded;
    if (timeDelta > 0.1) {
      const speed = bytesDelta / timeDelta;
      recentSpeeds.push(speed);
      if (recentSpeeds.length > 5) recentSpeeds.shift();
      lastTime = now;
      lastLoaded = bytesUploaded;
    }
    const avgSpeed =
      recentSpeeds.length > 0
        ? recentSpeeds.reduce((sum, speed) => sum + speed, 0) / recentSpeeds.length
        : 0;
    const remaining = file.size - bytesUploaded;
    const eta = avgSpeed > 0 ? Math.ceil(remaining / avgSpeed) : null;
    onProgress({
      progress: percentage,
      bytesPerSecond: avgSpeed,
      estimatedSecondsRemaining: eta,
    });
  };

  reportProgress();

  const resumeBase: MultipartUploadResumeSession = {
    videoId,
    fileName: file.name,
    fileSize: file.size,
    fileLastModified: file.lastModified,
    fileFingerprint: buildFileFingerprint(file),
    strategy: "multipart",
    uploadId: initiate.uploadId,
    s3Key: initiate.key,
    partSizeBytes: initiate.partSizeBytes,
    partCount: initiate.partCount,
    completedParts: mergeUploadedParts(completedParts),
    updatedAt: Date.now(),
  };

  await persistResumeSession(resumeBase);

  const signBatches = chunkArray(pendingPartNumbers, MAX_SIGN_PARTS_BATCH);
  for (const signBatch of signBatches) {
    if (signBatch.length === 0) continue;

    const { parts: signedParts } = await actions.signUploadParts({
      videoId,
      partNumbers: signBatch,
    });

    await runWithConcurrency(signedParts, MULTIPART_UPLOAD_CONCURRENCY, async (signedPart) => {
      const { start, end } = getPartByteRange(
        file.size,
        initiate.partSizeBytes,
        signedPart.partNumber,
      );
      const blob = file.slice(start, end);
      const etag = await uploadPartWithXhr(signedPart.url, blob, signal);
      completedMap.set(signedPart.partNumber, etag);
      bytesUploaded += end - start;
      reportProgress();

      await persistResumeSession({
        ...resumeBase,
        completedParts: mergeUploadedParts(
          [...completedMap.entries()].map(([partNumber, partEtag]) => ({
            partNumber,
            etag: partEtag,
          })),
        ),
        updatedAt: Date.now(),
      });
    });
  }

  const allParts = mergeUploadedParts(
    [...completedMap.entries()].map(([partNumber, etag]) => ({
      partNumber,
      etag,
    })),
  );

  if (allParts.length !== initiate.partCount) {
    throw new Error("Multipart upload is missing one or more parts.");
  }

  await actions.completeMultipartUpload({ videoId, parts: allParts });
  await deleteUploadResumeSession(videoId);
}

export async function uploadVideoFile(args: {
  file: File;
  videoId: Id<"videos">;
  actions: VideoUploadActions;
  signal: AbortSignal;
  onProgress: (update: UploadProgressUpdate) => void;
  resumeSession?: MultipartUploadResumeSession;
}) {
  if (isFileTooLarge(args.file.size)) {
    throw new Error(`Video file is too large. Maximum size is ${formatMaxUploadSize()}.`);
  }

  const contentType = args.file.type || "video/mp4";
  const initiate = await args.actions.initiateVideoUpload({
    videoId: args.videoId,
    filename: args.file.name,
    fileSize: args.file.size,
    contentType,
  });

  if (initiate.strategy === "single") {
    await uploadSingleWithXhr(initiate.url, args.file, contentType, args.signal, args.onProgress);
  } else if (initiate.strategy === "already_uploaded") {
    args.onProgress({ progress: 100, bytesPerSecond: 0, estimatedSecondsRemaining: 0 });
    await deleteUploadResumeSession(args.videoId);
  } else {
    await uploadMultipartFile({
      file: args.file,
      videoId: args.videoId,
      contentType,
      initiate,
      actions: args.actions,
      signal: args.signal,
      onProgress: args.onProgress,
      resumeSession: args.resumeSession,
    });
  }

  await args.actions.markUploadComplete({ videoId: args.videoId });
}

