"use client";

/**
 * Trigger a browser download for a presigned URL.
 * Falls back to opening a new tab if the download attribute is ignored.
 */
export function triggerDownload(url: string, filename?: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.rel = "noopener";
  anchor.target = "_blank";
  if (filename) {
    anchor.download = filename;
  }

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

