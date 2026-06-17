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

export function triggerTextDownload(content: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
