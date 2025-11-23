/**
 * Check if a file type supports preview in the browser
 * @param mimeType - MIME type of the file
 * @returns true if file can be previewed
 */
export function supportsPreview(mimeType: string): boolean {
  const lowerMime = mimeType.toLowerCase();

  // Images
  if (lowerMime.startsWith("image/")) {
    return true;
  }

  // PDF
  if (lowerMime === "application/pdf") {
    return true;
  }

  // Video
  if (lowerMime.startsWith("video/")) {
    return true;
  }

  // Audio
  if (lowerMime.startsWith("audio/")) {
    return true;
  }

  // Text files
  if (lowerMime.startsWith("text/")) {
    return true;
  }

  // JSON
  if (lowerMime === "application/json") {
    return true;
  }

  return false;
}

/**
 * Get preview type for a file
 * @param mimeType - MIME type of the file
 * @returns preview type or null if not supported
 */
export function getPreviewType(
  mimeType: string,
): "image" | "pdf" | "video" | "audio" | "text" | null {
  const lowerMime = mimeType.toLowerCase();

  if (lowerMime.startsWith("image/")) return "image";
  if (lowerMime === "application/pdf") return "pdf";
  if (lowerMime.startsWith("video/")) return "video";
  if (lowerMime.startsWith("audio/")) return "audio";
  if (lowerMime.startsWith("text/") || lowerMime === "application/json")
    return "text";

  return null;
}
