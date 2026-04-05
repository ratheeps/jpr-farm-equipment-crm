import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.STORAGE_ENDPOINT;
const region = process.env.STORAGE_REGION ?? "us-east-1";
const accessKeyId = process.env.STORAGE_ACCESS_KEY;
const secretAccessKey = process.env.STORAGE_SECRET_KEY;
const bucket = process.env.STORAGE_BUCKET;

if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
  throw new Error(
    "Missing STORAGE_* environment variables. Ensure STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY, and STORAGE_BUCKET are set."
  );
}

const s3 = new S3Client({
  endpoint,
  region,
  credentials: { accessKeyId, secretAccessKey },
  // Required for path-style access with MinIO
  forcePathStyle: true,
});

/**
 * Generates a presigned PUT URL for uploading a file directly to S3-compatible storage.
 * The URL is valid for 5 minutes.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: 300 });
}

/**
 * Returns the public URL for an object stored in S3-compatible storage.
 */
export function getPublicUrl(key: string): string {
  // Strip trailing slash from endpoint and compose URL
  const base = endpoint!.replace(/\/$/, "");
  return `${base}/${bucket}/${key}`;
}
