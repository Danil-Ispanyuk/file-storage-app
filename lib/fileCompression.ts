import sharp from "sharp";
// Dynamic import for compressjs to avoid build-time issues
let compressjs: typeof import("compressjs") | null = null;

async function getCompressjs() {
  if (!compressjs && typeof window === "undefined") {
    compressjs = await import("compressjs");
  }
  return compressjs;
}

const SUPPORTED_IMAGE_FORMATS = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const SUPPORTED_TEXT_FORMATS = [
  "text/plain",
  "text/html",
  "text/css",
  "text/javascript",
  "application/json",
  "application/xml",
  "text/xml",
  "text/csv",
  "application/javascript",
  "text/markdown",
];

const SUPPORTED_DOCUMENT_FORMATS = [
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-powerpoint", // .ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/pdf",
  "application/rtf",
];

// Minimum compression benefit threshold (5% reduction)
const MIN_COMPRESSION_BENEFIT = 0.05;

/**
 * Check if a file format can be compressed
 * @param mimeType - MIME type of the file
 * @returns true if format can be compressed
 */
export function isCompressible(mimeType: string): boolean {
  const lowerMime = mimeType.toLowerCase();
  return (
    SUPPORTED_IMAGE_FORMATS.includes(lowerMime) ||
    SUPPORTED_TEXT_FORMATS.includes(lowerMime) ||
    SUPPORTED_DOCUMENT_FORMATS.includes(lowerMime)
  );
}

/**
 * Check if an image is already compressed (to avoid re-compression)
 * @param buffer - Image buffer
 * @param mimeType - MIME type
 * @returns true if image appears to be already compressed
 */
async function isImageAlreadyCompressed(
  buffer: Buffer,
  mimeType: string,
): Promise<boolean> {
  if (!SUPPORTED_IMAGE_FORMATS.includes(mimeType.toLowerCase())) {
    return false;
  }

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Check file size - if very small, likely already compressed
    if (buffer.length < 100000) {
      // Less than 100KB - likely already optimized
      return true;
    }

    // For JPEG, check if quality is already low (indicates compression)
    if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
      // If file size is reasonable for dimensions, likely compressed
      const pixels = (metadata.width || 0) * (metadata.height || 0);
      const bytesPerPixel = buffer.length / pixels;

      // If less than 0.5 bytes per pixel, likely already compressed
      if (bytesPerPixel < 0.5 && pixels > 0) {
        return true;
      }
    }

    // For WebP, check if it's already WebP format (likely optimized)
    if (mimeType === "image/webp") {
      // WebP is already a compressed format
      return true;
    }

    return false;
  } catch {
    // If we can't analyze, assume not compressed
    return false;
  }
}

/**
 * Compress text or document file using compressjs (Lzp3 algorithm)
 * @param buffer - File buffer
 * @param mimeType - MIME type (to determine compression strategy)
 * @returns Compressed buffer
 */
async function compressTextOrDocumentFile(
  buffer: Buffer,
  mimeType: string,
): Promise<Buffer> {
  try {
    const compressjsModule = await getCompressjs();
    if (!compressjsModule) {
      // If compressjs is not available, return original
      return buffer;
    }

    const lowerMime = mimeType.toLowerCase();

    // DOCX, XLSX, PPTX are already ZIP archives, so compression benefit is limited
    // But we can still try to compress them further
    const isOfficeOpenXml =
      lowerMime.includes("openxmlformats") || lowerMime === "application/pdf";

    // For Office Open XML formats (DOCX, XLSX, PPTX) and PDF,
    // they're already compressed, so use less aggressive compression
    // For plain text and DOC files, use more aggressive compression
    const algorithm = isOfficeOpenXml
      ? compressjsModule.Lzp
      : compressjsModule.Lzp3;

    // Use Lzp3 compression for text files (good compression ratio for text)
    // Use Lzp for already-compressed formats (less aggressive)
    // compressjs API: compressFile expects array of numbers
    const dataArray = Array.from(new Uint8Array(buffer));
    const compressed = compressjsModule.compressFile(dataArray, algorithm);
    return Buffer.from(compressed);
  } catch (error) {
    console.error("Text/document compression error:", error);
    // Return original if compression fails
    return buffer;
  }
}

/**
 * Compress an image file using sharp
 * @param buffer - File buffer
 * @param mimeType - MIME type
 * @returns Compressed buffer and new MIME type
 */
async function compressImage(
  buffer: Buffer,
  mimeType: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const image = sharp(buffer);

  // Compress based on format
  let compressed: sharp.Sharp;

  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    compressed = image.jpeg({ quality: 80, progressive: true });
  } else if (mimeType === "image/png") {
    // PNG is lossless - use compressionLevel only (0-9, 9 = maximum compression)
    // For lossy compression, convert to JPEG or WebP
    compressed = image.png({ compressionLevel: 9 });
  } else if (mimeType === "image/webp") {
    compressed = image.webp({ quality: 80 });
  } else {
    // Default: convert to JPEG with quality 80
    compressed = image.jpeg({ quality: 80, progressive: true });
  }

  const compressedBuffer = await compressed.toBuffer();
  const newMimeType = mimeType.startsWith("image/") ? "image/jpeg" : mimeType;

  return {
    buffer: compressedBuffer,
    mimeType: newMimeType,
  };
}

/**
 * Estimate compression ratio for a file
 * @param originalSize - Original file size in bytes
 * @param mimeType - MIME type
 * @returns Estimated compression ratio (0-1, where 0.5 means 50% of original size)
 */
export function getCompressionRatio(
  originalSize: number,
  mimeType: string,
): number {
  const lowerMime = mimeType.toLowerCase();

  if (SUPPORTED_IMAGE_FORMATS.includes(lowerMime)) {
    // Images typically compress to 60-80% of original
    return 0.7;
  }
  if (SUPPORTED_TEXT_FORMATS.includes(lowerMime)) {
    // Text files can compress significantly (30-70% of original)
    return 0.5;
  }
  if (SUPPORTED_DOCUMENT_FORMATS.includes(lowerMime)) {
    // Document files compression depends on format:
    // - DOC (old format): 50-70% of original
    // - DOCX/XLSX/PPTX (already ZIP): 90-98% of original (minimal benefit)
    // - PDF: 85-95% of original (often already compressed)
    if (
      lowerMime.includes("openxmlformats") ||
      lowerMime === "application/pdf"
    ) {
      return 0.95; // Already compressed formats
    }
    return 0.6; // Old formats (DOC, XLS, PPT)
  }
  // Unknown format, assume no compression benefit
  return 1.0;
}

/**
 * Compress a file
 * @param buffer - File buffer
 * @param mimeType - MIME type
 * @param fileName - Original file name
 * @returns Compressed buffer, new MIME type, and compression stats
 */
export async function compressFile(
  buffer: Buffer | Uint8Array | ArrayBuffer,
  mimeType: string,
): Promise<{
  buffer: Buffer;
  mimeType: string;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  wasAlreadyCompressed?: boolean;
}> {
  // Convert to Buffer if needed
  const bufferToUse = Buffer.isBuffer(buffer)
    ? buffer
    : buffer instanceof ArrayBuffer
      ? Buffer.from(new Uint8Array(buffer))
      : Buffer.from(buffer);
  const originalSize = bufferToUse.length;

  // Check if compressible
  if (!isCompressible(mimeType)) {
    // Return original if not compressible
    return {
      buffer: bufferToUse,
      mimeType,
      originalSize,
      compressedSize: originalSize,
      ratio: 1.0,
      wasAlreadyCompressed: false,
    };
  }

  let compressedBuffer: Buffer;
  let newMimeType: string;
  let wasAlreadyCompressed = false;

  // Compress based on type
  if (SUPPORTED_IMAGE_FORMATS.includes(mimeType.toLowerCase())) {
    // Check if image is already compressed
    const alreadyCompressed = await isImageAlreadyCompressed(
      bufferToUse,
      mimeType,
    );

    if (alreadyCompressed) {
      // Image is already compressed - skip compression to avoid quality loss
      compressedBuffer = bufferToUse;
      newMimeType = mimeType;
      wasAlreadyCompressed = true;
    } else {
      // Compress the image
      const result = await compressImage(bufferToUse, mimeType);
      compressedBuffer = result.buffer;
      newMimeType = result.mimeType;

      // Check if compression actually helped
      const compressionBenefit = 1 - compressedBuffer.length / originalSize;
      if (compressionBenefit < MIN_COMPRESSION_BENEFIT) {
        // Compression didn't help much - likely already optimized
        // Return original to avoid quality loss
        compressedBuffer = bufferToUse;
        newMimeType = mimeType;
        wasAlreadyCompressed = true;
      }
    }
  } else if (
    SUPPORTED_TEXT_FORMATS.includes(mimeType.toLowerCase()) ||
    SUPPORTED_DOCUMENT_FORMATS.includes(mimeType.toLowerCase())
  ) {
    // Compress text or document files using compressjs
    compressedBuffer = await compressTextOrDocumentFile(bufferToUse, mimeType);
    newMimeType = mimeType; // Keep original MIME type

    // Check if compression helped
    // For Office Open XML (DOCX, XLSX, PPTX) and PDF, they're already compressed
    // So we use a lower threshold (2% instead of 5%)
    const lowerMime = mimeType.toLowerCase();
    const isAlreadyCompressedFormat =
      lowerMime.includes("openxmlformats") || lowerMime === "application/pdf";

    const threshold = isAlreadyCompressedFormat
      ? 0.02
      : MIN_COMPRESSION_BENEFIT;
    const compressionBenefit = 1 - compressedBuffer.length / originalSize;

    if (compressionBenefit < threshold) {
      // Compression didn't help enough - return original
      compressedBuffer = bufferToUse;
      wasAlreadyCompressed = true;
    }
  } else {
    // Unknown format - return original
    compressedBuffer = bufferToUse;
    newMimeType = mimeType;
  }

  const compressedSize = compressedBuffer.length;
  const ratio = compressedSize / originalSize;

  return {
    buffer: compressedBuffer,
    mimeType: newMimeType,
    originalSize,
    compressedSize,
    ratio,
    wasAlreadyCompressed,
  };
}
