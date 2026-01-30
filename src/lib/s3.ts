// S3-compatible storage helpers for Railway
// Uses AWS SDK v3 with presigned URLs for direct browser uploads

export interface MultipartUploadInit {
  uploadId: string;
  key: string;
}

export interface PresignedPart {
  partNumber: number;
  url: string;
}

export interface CompletedPart {
  partNumber: number;
  etag: string;
}

// Minimum part size for multipart upload (5MB, S3 requirement)
export const MIN_PART_SIZE = 5 * 1024 * 1024;

// Maximum part size (100MB for better reliability)
export const MAX_PART_SIZE = 100 * 1024 * 1024;

// Calculate optimal part size based on file size
export function calculatePartSize(fileSize: number): number {
  // S3 allows max 10,000 parts
  const minPartSizeForFile = Math.ceil(fileSize / 10000);
  return Math.max(MIN_PART_SIZE, Math.min(MAX_PART_SIZE, minPartSizeForFile));
}

// Calculate number of parts needed
export function calculateNumParts(fileSize: number, partSize: number): number {
  return Math.ceil(fileSize / partSize);
}

export interface UploadProgressInfo {
  percentage: number;
  uploadedBytes: number;
  totalBytes: number;
  bytesPerSecond: number;
  estimatedSecondsRemaining: number | null;
}

// Client-side multipart uploader
export class MultipartUploader {
  private file: File;
  private uploadId: string;
  private key: string;
  private partSize: number;
  private onProgress?: (info: UploadProgressInfo) => void;
  private onComplete?: (parts: CompletedPart[]) => void;
  private onError?: (error: Error) => void;
  private aborted: boolean = false;
  private uploadedBytes: number = 0;
  private completedParts: CompletedPart[] = [];
  private startTime: number = 0;
  private lastProgressTime: number = 0;
  private lastProgressBytes: number = 0;
  private recentSpeeds: number[] = [];

  constructor(options: {
    file: File;
    uploadId: string;
    key: string;
    partSize?: number;
    onProgress?: (info: UploadProgressInfo) => void;
    onComplete?: (parts: CompletedPart[]) => void;
    onError?: (error: Error) => void;
  }) {
    this.file = options.file;
    this.uploadId = options.uploadId;
    this.key = options.key;
    this.partSize = options.partSize || calculatePartSize(options.file.size);
    this.onProgress = options.onProgress;
    this.onComplete = options.onComplete;
    this.onError = options.onError;
  }

  private calculateSpeed(): number {
    const now = Date.now();
    const timeDelta = (now - this.lastProgressTime) / 1000; // seconds
    const bytesDelta = this.uploadedBytes - this.lastProgressBytes;

    if (timeDelta > 0) {
      const currentSpeed = bytesDelta / timeDelta;
      this.recentSpeeds.push(currentSpeed);
      // Keep only last 5 speed measurements for smoothing
      if (this.recentSpeeds.length > 5) {
        this.recentSpeeds.shift();
      }
    }

    this.lastProgressTime = now;
    this.lastProgressBytes = this.uploadedBytes;

    // Return average of recent speeds for smoother display
    if (this.recentSpeeds.length === 0) return 0;
    return this.recentSpeeds.reduce((a, b) => a + b, 0) / this.recentSpeeds.length;
  }

  private reportProgress() {
    const percentage = Math.round((this.uploadedBytes / this.file.size) * 100);
    const bytesPerSecond = this.calculateSpeed();
    const remainingBytes = this.file.size - this.uploadedBytes;
    const estimatedSecondsRemaining = bytesPerSecond > 0
      ? Math.ceil(remainingBytes / bytesPerSecond)
      : null;

    this.onProgress?.({
      percentage,
      uploadedBytes: this.uploadedBytes,
      totalBytes: this.file.size,
      bytesPerSecond,
      estimatedSecondsRemaining,
    });
  }

  async uploadParts(presignedUrls: PresignedPart[]): Promise<void> {
    const numParts = calculateNumParts(this.file.size, this.partSize);
    this.startTime = Date.now();
    this.lastProgressTime = this.startTime;

    try {
      // Upload parts sequentially for reliability (can be parallelized for speed)
      for (let i = 0; i < numParts && !this.aborted; i++) {
        const partNumber = i + 1;
        const start = i * this.partSize;
        const end = Math.min(start + this.partSize, this.file.size);
        const chunk = this.file.slice(start, end);

        const presignedUrl = presignedUrls.find(p => p.partNumber === partNumber);
        if (!presignedUrl) {
          throw new Error(`Missing presigned URL for part ${partNumber}`);
        }

        const response = await fetch(presignedUrl.url, {
          method: "PUT",
          body: chunk,
          headers: {
            "Content-Type": "application/octet-stream",
          },
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(`Failed to upload part ${partNumber}: ${response.status} ${text}`);
        }

        const etag = response.headers.get("ETag");
        if (!etag) {
          throw new Error(`Missing ETag for part ${partNumber}`);
        }

        this.completedParts.push({
          partNumber,
          etag: etag.replace(/"/g, ""), // Remove quotes from ETag
        });

        this.uploadedBytes += chunk.size;
        this.reportProgress();
      }

      if (!this.aborted) {
        this.onComplete?.(this.completedParts);
      }
    } catch (error) {
      this.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  abort(): void {
    this.aborted = true;
  }

  getCompletedParts(): CompletedPart[] {
    return this.completedParts;
  }
}

// Generate a unique key for video storage
export function generateVideoKey(videoId: string, filename: string): string {
  const ext = filename.split(".").pop() || "mp4";
  const timestamp = Date.now();
  return `videos/${videoId}/${timestamp}.${ext}`;
}

// Generate thumbnail key
export function generateThumbnailKey(videoId: string): string {
  return `thumbnails/${videoId}/thumb.jpg`;
}
