import { createRoot } from "react-dom/client";
import { useState } from "react";
import { VideoPlayer } from "../../src/components/video-player/VideoPlayer";
import { VideoEditorLayout } from "../../src/components/video-player/VideoEditorLayout";
import "../../app/app.css";

function Harness() {
  const [theaterMode, setTheaterMode] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(true);
  const [source, setSource] = useState("preview");
  const [, setTime] = useState(0);
  return (
    <div style={{ height: "80dvh", margin: 40 }}>
      <VideoEditorLayout theaterMode={theaterMode}>
        <header className="border-b border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)]">
          <button
            className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-alt)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            onClick={() => setCommentsVisible((v) => !v)}
            aria-expanded={commentsVisible}
            aria-controls="preview-comments"
          >
            Toggle comments
          </button>
        </header>
        <div className="flex min-h-0 flex-1">
          <VideoPlayer
            src={`/sample.mp4?source=${source}`}
            controlsBelow
            editorControls={!location.search.includes("public")}
            theaterMode={theaterMode}
            onToggleTheater={() => setTheaterMode((v) => !v)}
            onTimeUpdate={(time) => setTime(time)}
            qualityOptionsConfig={[
              { id: "preview", label: "Preview" },
              { id: "original", label: "Original" },
            ]}
            selectedQualityId={source}
            onSelectQuality={setSource}
          />
          <aside
            id="preview-comments"
            hidden={!commentsVisible}
            className="w-64 shrink-0 space-y-5 overflow-y-auto border-l border-[var(--border-subtle)] bg-[var(--surface)] p-4 text-sm text-[var(--foreground)]"
          >
            <label className="block space-y-2">
              <span className="block font-medium">Comment</span>
              <input
                aria-label="Comment"
                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              />
            </label>
            <div className="space-y-2">
              <span id="rich-comment-label" className="block font-medium">
                Rich comment
              </span>
              <div
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-labelledby="rich-comment-label"
                aria-multiline="true"
                className="min-h-24 rounded-md border border-[var(--border-subtle)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              >
                <span>Editable text</span>
              </div>
            </div>
            <label className="block space-y-2">
              <span className="block font-medium">Editable slider</span>
              <input
                type="range"
                aria-label="Editable slider"
                className="w-full accent-[var(--accent)]"
              />
            </label>
          </aside>
        </div>
      </VideoEditorLayout>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
