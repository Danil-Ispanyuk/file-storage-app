const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// Allowed MIME types (whitelist)
const ALLOWED_MIME_TYPES = [
  // Images
  /^image\//,
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Text files
  /^text\//,
  // JSON
  "application/json",
];

/**
 * Validate file size
 */
export function validateFileSize(size: number): {
  valid: boolean;
  error?: string;
} {
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }
  return { valid: true };
}

/**
 * Validate file MIME type
 */
export function validateMimeType(mimeType: string): {
  valid: boolean;
  error?: string;
} {
  const isAllowed = ALLOWED_MIME_TYPES.some((allowedType) => {
    if (typeof allowedType === "string") {
      return mimeType === allowedType;
    }
    // Regex pattern
    return allowedType.test(mimeType);
  });

  if (!isAllowed) {
    return {
      valid: false,
      error: `File type ${mimeType} is not allowed`,
    };
  }

  return { valid: true };
}

/**
 * Validate file name
 */
export function validateFileName(fileName: string): {
  valid: boolean;
  error?: string;
} {
  if (!fileName || fileName.trim().length === 0) {
    return {
      valid: false,
      error: "File name cannot be empty",
    };
  }

  // Prevent path traversal
  if (
    fileName.includes("..") ||
    fileName.includes("/") ||
    fileName.includes("\\")
  ) {
    return {
      valid: false,
      error: "Invalid file name",
    };
  }

  // Max length
  if (fileName.length > 255) {
    return {
      valid: false,
      error: "File name is too long (max 255 characters)",
    };
  }

  return { valid: true };
}

/**
 * Validate file (size, MIME type, name)
 */
export function validateFile(
  size: number,
  mimeType: string,
  fileName: string,
): {
  valid: boolean;
  error?: string;
} {
  // Validate file size
  const sizeValidation = validateFileSize(size);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  // Validate MIME type
  const mimeValidation = validateMimeType(mimeType);
  if (!mimeValidation.valid) {
    return mimeValidation;
  }

  // Validate file name
  const nameValidation = validateFileName(fileName);
  if (!nameValidation.valid) {
    return nameValidation;
  }

  return { valid: true };
}
