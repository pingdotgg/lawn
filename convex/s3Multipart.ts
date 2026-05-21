"use node";

import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  ListPartsCommand,
  UploadPartCommand,
  type CompletedPart,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BUCKET_NAME, getS3Client } from "./s3";
import {
  MULTIPART_PART_SIZE_BYTES,
  PRESIGN_PART_EXPIRES_SEC,
  computePartCount,
} from "./uploadLimits";

export type UploadedPartInfo = {
  partNumber: number;
  etag: string;
};

export async function createMultipartUploadSession(args: {
  key: string;
  contentType: string;
}) {
  const s3 = getS3Client();
  const result = await s3.send(
    new CreateMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: args.key,
      ContentType: args.contentType,
    }),
  );

  if (!result.UploadId) {
    throw new Error("Failed to start multipart upload.");
  }

  return { uploadId: result.UploadId, key: args.key };
}

export async function signMultipartUploadParts(args: {
  key: string;
  uploadId: string;
  partNumbers: number[];
}) {
  const s3 = getS3Client();
  const signedParts = await Promise.all(
    args.partNumbers.map(async (partNumber) => {
      const command = new UploadPartCommand({
        Bucket: BUCKET_NAME,
        Key: args.key,
        UploadId: args.uploadId,
        PartNumber: partNumber,
      });
      const url = await getSignedUrl(s3, command, {
        expiresIn: PRESIGN_PART_EXPIRES_SEC,
      });
      return { partNumber, url };
    }),
  );

  return signedParts;
}

export async function listMultipartUploadedParts(args: {
  key: string;
  uploadId: string;
}): Promise<UploadedPartInfo[]> {
  const s3 = getS3Client();
  const parts: UploadedPartInfo[] = [];
  let partNumberMarker: string | undefined;

  while (true) {
    const result = await s3.send(
      new ListPartsCommand({
        Bucket: BUCKET_NAME,
        Key: args.key,
        UploadId: args.uploadId,
        PartNumberMarker: partNumberMarker,
      }),
    );

    for (const part of result.Parts ?? []) {
      if (
        typeof part.PartNumber === "number" &&
        typeof part.ETag === "string" &&
        part.ETag.length > 0
      ) {
        parts.push({
          partNumber: part.PartNumber,
          etag: part.ETag,
        });
      }
    }

    if (!result.IsTruncated) {
      break;
    }
    partNumberMarker = result.NextPartNumberMarker;
    if (!partNumberMarker) {
      break;
    }
  }

  return parts.sort((a, b) => a.partNumber - b.partNumber);
}

export async function completeMultipartUploadSession(args: {
  key: string;
  uploadId: string;
  parts: UploadedPartInfo[];
}) {
  const s3 = getS3Client();
  const completedParts: CompletedPart[] = [...args.parts]
    .sort((a, b) => a.partNumber - b.partNumber)
    .map((part) => ({
      PartNumber: part.partNumber,
      ETag: part.etag,
    }));

  await s3.send(
    new CompleteMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: args.key,
      UploadId: args.uploadId,
      MultipartUpload: { Parts: completedParts },
    }),
  );
}

export async function abortMultipartUploadSession(args: {
  key: string;
  uploadId: string;
}) {
  const s3 = getS3Client();
  try {
    await s3.send(
      new AbortMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key: args.key,
        UploadId: args.uploadId,
      }),
    );
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "";
    if (errorName === "NoSuchUpload" || errorName === "NotFound") {
      return;
    }
    throw error;
  }
}

export function getMultipartPlan(fileSize: number) {
  const partSizeBytes = MULTIPART_PART_SIZE_BYTES;
  const partCount = computePartCount(fileSize, partSizeBytes);
  return { partSizeBytes, partCount };
}
