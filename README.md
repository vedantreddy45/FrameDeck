# FrameDeck — Screen Capture, Recording Studio & Video Editor

**FrameDeck** is a high-quality laptop screenshot tool, interactive screen video recorder, timeline video editor, standalone Desktop App (PWA), and Chrome Browser Extension.

Capture crisp screenshots directly to your clipboard, wrap recordings in curated or custom vibrant studio backgrounds, record simultaneous **system audio + microphone**, use **double-tap mouse zoom** and **PDF-style hold-to-highlight sentences**, trim/cut middle sections, and export videos with background music.

---

## Features

- **Instant Screenshots to Clipboard**: Capture any screen, application window, or browser tab in up to **4K** resolution, composite it over a studio background, save to your local library, and copy the PNG straight to your clipboard (`Alt+S` / `Alt+C`).
- **High-Quality Screen Video Recording**: Record in **4K 60fps**, **1080p 60fps**, or **720p 30fps** as WebM, with optional live vibrant background compositing.
- **Simultaneous System + Microphone Audio**: Mix laptop/tab audio and microphone input together through Web Audio gain sliders, live input level meters, microphone device selector, and a **Test Mic** check.
- **Interactive Video Effects**:
  - **Double-Tap Mouse Zoom**: Double-click anywhere on the capture canvas (or on any webpage via the Chrome Extension) to smoothly zoom into that cursor point (`1.40×`–`2.60×`); double-click again to smoothly zoom out.
  - **PDF-Style Sentence Highlighting**: Press and drag across sentences to highlight them like a PDF reader (Amber, Cyan, Rose, or Mint); releasing the mouse key returns the text immediately to normal.
- **Vibrant & Custom Backgrounds**: Includes 4 studio wallpapers (*Aurora Prism*, *Sunset Mesh*, *Emerald Ocean*, *Velvet Nebula*), 8 vibrant studio gradients, and a modal to add custom multi-stop gradients or upload your own images (`PNG`, `JPG`, `WebP`).
- **Built-In Video Editor (`Editor` Tab)**:
  - Trim video start and end points.
  - Mark and cut out unwanted middle sections with non-destructive segment restoration.
  - Add built-in synthesized music tracks (*Lo-Fi Focus Rhodes*, *Studio Ambient Pad*, *Indigo Tech Pluck*) or upload your own `MP3` / `WAV` / `OGG` tracks.
  - Mix original video audio and background music volumes independently and export the edited **WebM** video.
- **Desktop App (PWA) & Chrome Extension (`Extension` Tab)**:
  - Install FrameDeck as an offline-capable standalone laptop window via PWA.
  - Download the ready-to-load **Manifest V3 Chrome Extension** `.zip` directly inside the app.

---

## Documentation Files

- [`README.md`](./README.md) — Features, laptop installation, usage guide, and keyboard shortcuts.
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — Detailed guide on deploying FrameDeck permanently on your laptop (Desktop PWA, local background server, LAN/HTTPS setup, and Chrome Extension deployment).
- [`public/extension/README.md`](./public/extension/README.md) — Chrome Browser Extension (Manifest V3) setup, permissions, and usage instructions.

---

## Installation on Your Laptop

### Prerequisites

- **Node.js** `18+` (recommended `20+` or `22+`) and **npm**
- A Chromium-based desktop browser (**Google Chrome**, **Microsoft Edge**, **Brave**) or **Firefox** (Chrome/Edge recommended for simultaneous system audio capture, PWA desktop install, and the Chrome Extension)

### 1. Install Dependencies

Open a terminal in the project folder and run:

```bash
npm install
```

### 2. Run Locally in Development Mode

```bash
npm run dev
```

Open **`http://localhost:3000`** in Chrome or Edge.

### 3. Build & Preview Production Bundle

```bash
npm run build
npm run preview
```

> **Type-check (`tsc --noEmit`)**:
> ```bash
> npm run lint
> ```
>
> **Run Unit Tests**:
> ```bash
> npx tsx --test src/utils/backgrounds.test.ts src/utils/canvasCompositor.test.ts src/utils/shortcuts.test.ts src/utils/videoEffects.test.ts src/utils/videoEditor.test.ts
> ```

---

## How to Use FrameDeck

### Taking Screenshots (`Studio` → `Screenshot`)

1. Pick a **Vibrant Background** from the right-hand Inspector, press keys **`1`–`9`** for quick background switching, or click **`+ Add Custom`** to create a custom gradient or upload your own wallpaper.
2. Adjust **Aspect Ratio** (`Auto`, `16:9`, `4:3`, `1:1`, `9:16`), **Window Chrome** (`None`, `Dark Bar`, `Light Bar`), **Padding**, **Corner Radius**, and **Drop Shadow**.
3. Click **Take Screenshot** (or press **`Alt+S`**) and choose the screen, window, or browser tab you want to capture.
4. FrameDeck composites the capture onto your chosen background, saves it to the **Captures** library (stored locally in IndexedDB), and copies the PNG directly to your clipboard so you can paste (`Ctrl+V` / `Cmd+V`) immediately into Slack, Discord, Docs, or email.
   - Use **Save Sample Frame** (`Alt+F`) anytime to test framing and clipboard export without opening the OS screen picker.

### Recording Screen Videos (`Studio` → `Record Video`)

1. Switch to **Record Video** in the top-left of the Studio stage (or press **`Alt+R`**).
2. In the right Inspector under **Video & Audio Recording**:
   - Choose **Capture Quality** (`4K · 60fps`, `1080p · 60fps`, or `720p · 30fps`).
   - Toggle **Include Vibrant Background in Video** if you want the studio background and window frame baked into the recording.
   - Enable **Double-Tap Mouse Zoom** and adjust **Zoom Depth** (`1.40×`–`2.60×`).
   - Enable **PDF Sentence Highlight (Hold)** and choose a highlight color (**Amber**, **Cyan**, **Rose**, **Mint**).
   - Enable **System Audio** and/or **Microphone**, select your input device, adjust gains, and click **Test Mic** to verify levels.
3. Click **Start Screen Recording**. In the browser's screen-picker dialog, check **"Also share system/tab audio"** (or **"Share tab audio"**) if capturing laptop audio.
4. During recording or preview on the Studio canvas:
   - **Double-click** any point on the canvas to smoothly zoom in; **double-click** again to zoom back out (or click **Reset** in the top metadata bar).
   - **Press and drag** across lines on the canvas to highlight sentences; **release** the mouse button to return to normal.
5. Click **Pause** (`Alt+P`) to pause/resume, or **Stop & Save** (`Alt+R`) to store the recording in **Captures**.

### Editing Videos (`Editor` Tab)

1. Open any saved video by clicking **Edit Video** on a video card in **Captures**, or go to the **Editor** tab and click **Import Video** (or **Create Demo Clip** to try with a generated clip).
2. **Trim**: Drag **Trim Start** and **Trim End** sliders to keep only the desired range.
3. **Cut Middle Sections**: Scrub the playhead to the start of an unwanted section, click **Cut Section**, scrub to the end of that section, and click **Cut End**. Click any cut chip to restore a removed section.
4. **Add Music**: Select a built-in studio track (*Lo-Fi Focus Rhodes*, *Studio Ambient Pad*, *Indigo Tech Pluck*) or click **Upload Custom Audio (MP3/WAV)** to load your own track. Click **Audition** to preview music, and balance **Original Video Audio** and **Music Volume**.
5. Click **Export & Save Edited Video** to render the final **WebM** file, save it to **Captures**, and download it to your laptop.

---

## Default Keyboard Shortcuts

You can customize any hotkey in the **`Shortcuts`** tab.

| Action | Default Hotkey (Windows/Linux) | Default Hotkey (macOS) | Description |
| :--- | :--- | :--- | :--- |
| Take Screenshot | `Alt + S` | `⌥ + S` | Open screen picker, frame with background, and copy PNG to clipboard |
| Start / Stop Recording | `Alt + R` | `⌥ + R` | Start or stop screen video recording |
| Pause / Resume Video | `Alt + P` | `⌥ + P` | Pause or resume an active recording |
| Copy to Clipboard | `Alt + C` | `⌥ + C` | Copy the current Studio canvas PNG to clipboard |
| Download Capture | `Alt + D` | `⌥ + D` | Download current composited PNG |
| Capture Sample Frame | `Alt + F` | `⌥ + F` | Save current Studio preview to Captures and copy to clipboard |
| Quick Background Switch | `1` – `9` | `1` – `9` | Switch between the first 9 vibrant backgrounds |

> **Chrome Extension Global Shortcuts**: `Alt+S` captures the active browser tab directly to your clipboard; `Alt+Z` toggles interactive webpage zoom & sentence highlighting.

---

## Privacy & Local Storage

All screenshots, custom backgrounds, settings, shortcuts, and recorded/edited videos are stored **100% locally in your browser** using **IndexedDB** and **`localStorage`**. FrameDeck does not upload your screen captures or audio to external servers.
