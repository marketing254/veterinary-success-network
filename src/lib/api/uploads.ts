/** Upload validation shared by the portal upload routes. */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const RESOURCE_MAX_BYTES = 50 * 1024 * 1024;
export const AVATAR_REJECT_MESSAGE = "Please upload a JPG, PNG or WebP image under 5 MB.";

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const RESOURCE_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "text/plain": "txt",
  "text/csv": "csv",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "application/zip": "zip",
  ...IMAGE_TYPES,
};

export function resolveImageUpload(file: File): { ext: string; contentType: string } | null {
  const ext = IMAGE_TYPES[file.type];
  return ext ? { ext, contentType: file.type } : null;
}

export function resolveResourceUpload(file: File): { ext: string; contentType: string } | null {
  const ext = RESOURCE_TYPES[file.type];
  return ext ? { ext, contentType: file.type } : null;
}

export function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}
