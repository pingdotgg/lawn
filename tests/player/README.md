Run `bun run test:player` after `bunx playwright install chromium`.
The suite starts a separate Vite harness and drives the production VideoPlayer and
VideoEditorLayout through Chromium at localhost. It checks shortcuts, real reverse
seeking, shared-player behavior, and media identity/state across layout changes.
It requires no Clerk or Convex credentials and does not exercise the authenticated
route or Mux/HLS recovery. The harness is not a production app route.

The generated fixture is a 20-second, 30 fps H.264 test pattern with no audio:

```sh
ffmpeg -f lavfi -i testsrc2=size=320x180:rate=30 -t 20 -c:v libx264 -preset fast -crf 35 -pix_fmt yuv420p -movflags +faststart tests/player/sample.mp4
```

Editor shortcuts follow Apple's [playback guide](https://support.apple.com/guide/final-cut-pro/play-media-ver90ba4ef0/mac)
and [default shortcuts](https://support.apple.com/guide/final-cut-pro/keyboard-shortcuts-ver90ba5929/mac):

- Space toggles playback throughout the editor, including after mouse clicks on layout controls.
- J/L shuttle backward/forward at 1, 2, 4, 8, 16, and 32 times speed; K pauses.
- Hold K and tap J/L to step one frame. Hold both for half-speed playback; releasing either pauses.
- Option/Alt+J/L plays at half speed. Shift+Space plays backward at 1x.
- Arrows pause and step one frame; Shift+arrows step ten frames.

Typing, editable controls, menus, and dialogs are excluded. Tab-focused buttons
retain their native Space action. Other browser modifier combinations are left
alone. Public players keep their local focus boundary and five-second arrow seeks.
Comma/period remain optional paused frame-step aliases.

Lawn currently has no source frame-rate metadata, so stepping uses 1/30 second,
an approximation for non-30-fps and variable-frame-rate media. Reverse and 32x
use paused seeks without audio; smoothness depends on source seek/decode latency.
