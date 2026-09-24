import { useEffect, useRef, useState } from "react";
import { createAsyncTaskQueue } from "./videoUpload";
import { extractVideoThumbnail } from "./videoThumbnail";

export function useUploadThumbnails(
  uploads: readonly {
    id: string;
    file: File;
    previewReleased?: boolean;
  }[],
) {
  const [urls, setUrls] = useState<ReadonlyMap<string, string>>(new Map());
  const resources = useRef(
    new Map<
      string,
      {
        file: File;
        controller: AbortController;
        url?: string;
      }
    >(),
  );
  const queue = useRef<ReturnType<typeof createAsyncTaskQueue> | null>(null);
  queue.current ??= createAsyncTaskQueue(2);

  useEffect(() => {
    const active = new Map(
      uploads.filter((upload) => !upload.previewReleased).map((upload) => [upload.id, upload]),
    );
    const publish = () =>
      setUrls(
        new Map(
          [...resources.current].flatMap(([id, resource]) =>
            resource.url ? [[id, resource.url] as const] : [],
          ),
        ),
      );
    for (const [id, resource] of resources.current) {
      if (active.get(id)?.file === resource.file) continue;
      resource.controller.abort();
      if (resource.url) URL.revokeObjectURL(resource.url);
      resources.current.delete(id);
      publish();
    }
    for (const [id, upload] of active) {
      if (resources.current.has(id)) continue;
      const resource = {
        file: upload.file,
        controller: new AbortController(),
        url: undefined as string | undefined,
      };
      resources.current.set(id, resource);
      void queue.current!.add(async () => {
        const blob = await extractVideoThumbnail(resource.file, resource.controller.signal);
        if (!blob || resource.controller.signal.aborted || resources.current.get(id) !== resource)
          return;
        resource.url = URL.createObjectURL(blob);
        publish();
      });
    }
  }, [uploads]);

  useEffect(
    () => () => {
      for (const resource of resources.current.values()) {
        resource.controller.abort();
        if (resource.url) URL.revokeObjectURL(resource.url);
      }
      resources.current.clear();
    },
    [],
  );
  return urls;
}
