import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { env } from "@/lib/env";

// Initialize S3 client
const s3Client = new S3Client({
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

/**
 * Generate unique file path/key in S3
 * Format: {timestamp}-{random}.{extension}
 */
function generateFilePath(fileName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = fileName.split(".").pop() || "bin";
  return `${timestamp}-${random}.${extension}`;
}

/**
 * Upload file to S3
 * @param buffer - File buffer
 * @param fileName - Original file name
 * @returns S3 key (path in bucket)
 */
export async function uploadFile(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const key = generateFilePath(fileName);

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    Body: buffer,
    // Set Content-Type if possible
    ContentType: "application/octet-stream",
  });

  await s3Client.send(command);

  return key;
}

/**
 * Download file from S3
 * @param key - S3 key (path in bucket)
 * @returns File buffer
 */
export async function downloadFile(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error("File not found or empty");
  }

  // Convert stream to buffer
  // Body can be ReadableStream (browser) or Readable (Node.js)
  const stream = response.Body as Readable;

  const chunks: Buffer[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    stream.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Delete file from S3
 * @param key - S3 key (path in bucket)
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Check if file exists in S3
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    // 404 means file doesn't exist
    if (
      (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode === 404
    ) {
      return false;
    }
    // Re-throw other errors
    throw error;
  }
}
