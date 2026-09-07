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
        <header className="bg-white p-2">
          <button onClick={() => setCommentsVisible((v) => !v)} aria-expanded={commentsVisible}>
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
          <aside hidden={!commentsVisible} className="w-64 shrink-0 bg-white p-4">
            <label>
              Comment
              <input aria-label="Comment" />
            </label>
            <div contentEditable suppressContentEditableWarning aria-label="Rich comment">
              <span>Editable text</span>
            </div>
            <input type="range" aria-label="Editable slider" />
          </aside>
        </div>
      </VideoEditorLayout>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
