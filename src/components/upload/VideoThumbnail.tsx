import { useState } from "react";

// Keep the local frame underneath until the processed image has loaded.
export function VideoThumbnail({
  src,
  localSrc,
  alt,
  eager = false,
  priority = false,
  onProcessedLoad,
}: {
  src?: string;
  localSrc?: string;
  alt: string;
  eager?: boolean;
  priority?: boolean;
  onProcessedLoad?: () => void;
}) {
  const [loadedSrc, setLoadedSrc] = useState<string>();
  return (
    <>
      {localSrc && (!src || loadedSrc !== src) && (
        <img
          src={localSrc}
          alt={alt}
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {src && (
        <img
          src={src}
          alt={alt}
          draggable={false}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onLoad={() => {
            setLoadedSrc(src);
            onProcessedLoad?.();
          }}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: localSrc && loadedSrc !== src ? 0 : 1 }}
        />
      )}
    </>
  );
}
