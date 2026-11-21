# FrameDeck Chrome Browser Extension (Manifest V3)

The **FrameDeck Chrome Extension** adds instant tab capture to clipboard and live interactive recording effects (**double-tap mouse zoom** and **PDF-style hold-to-highlight sentences**) to any webpage you browse or record.

---

## Features

- **1-Click Tab Screenshot to Clipboard**: Captures the visible active browser tab at full quality and writes the PNG image straight to your clipboard (`Alt+S` or popup button).
- **Double-Tap Webpage Zoom**: Double-click anywhere on a webpage to smoothly zoom into the cursor coordinates (`1.85×`); double-click again to smoothly zoom back out.
- **PDF-Style Sentence Highlighting**: Hold left-click and drag across any text on a webpage to highlight sentences while held; releasing the mouse button (`mouseup`) clears the highlight back to normal.
- **Quick Launch Studio**: Opens your FrameDeck Desktop / Studio URL directly from the extension popup.

---

## How to Install (Chrome / Edge / Brave)

1. Obtain the extension folder in one of two ways:
   - Open FrameDeck → **`Extension`** tab → click **`Download Chrome Extension (.zip)`** and unzip `framedeck-chrome-extension.zip` to a permanent folder on your laptop.
   - Or use the `public/extension/` folder directly from the FrameDeck source directory.
2. Open **`chrome://extensions`** in Chrome (or `edge://extensions` in Microsoft Edge).
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked**.
5. Select the folder containing `manifest.json` (`framedeck-chrome-extension` or `public/extension`).
6. Click the puzzle-piece Extensions icon in your browser toolbar and **Pin** FrameDeck.

---

## How to Use

### Extension Popup Controls
Click the **FrameDeck** icon in your toolbar to configure:
- **Capture Active Tab → Clipboard**: Takes a PNG screenshot of the current tab and copies it directly to your clipboard.
- **Enable Recording Effects**: Master toggle for live webpage effects.
- **Double-Tap Mouse Zoom**: Enable/disable double-click zoom on webpages.
- **Hold-Drag Sentence Highlight**: Enable/disable PDF-style press-and-hold sentence highlighting.
- **Studio App URL**: Set where FrameDeck Studio runs (defaults to `http://localhost:3000`; update this if you host FrameDeck on another port or HTTPS domain).
- **Open FrameDeck Studio**: Launches Studio in a new tab.

### Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Alt + S` | Capture current tab screenshot and copy PNG to clipboard |
| `Alt + Z` | Toggle interactive zoom & sentence highlight effects on/off |

> You can customize these shortcuts anytime in Chrome at **`chrome://extensions/shortcuts`**.

---

## Permissions Explained

- `activeTab` & `scripting`: Captures the currently active tab when triggered and copies the PNG image via the Clipboard API on that page.
- `clipboardWrite`: Allows copying captured PNGs directly to your OS clipboard.
- `storage`: Saves your effect toggles (`effectsEnabled`, `doubleTapZoom`, `sentenceHighlight`) and custom `studioUrl` locally in `chrome.storage.local`.

---

## Notes & Troubleshooting

- **Protected Browser Pages**: Chrome restricts extensions from running on internal pages (`chrome://...`, `edge://...`, and Chrome Web Store pages). Test on any normal `https://` or `http://localhost` webpage.
- **Reloading After Edits**: If you modify files inside the unpacked extension folder, click the **Reload (↻)** button on the FrameDeck card in `chrome://extensions` and refresh open tabs.
