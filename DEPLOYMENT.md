# Deploying FrameDeck on Your Laptop

FrameDeck can be deployed on your laptop in three ways depending on how you want to work:

1. **Standalone Desktop App (PWA)** — installs cleanly into your Windows Start Menu, macOS Dock/Applications, or Linux App Launcher and works offline.
2. **Local Laptop Background Server (`dist/`)** — builds the production bundle and runs persistently on `http://localhost:3000` without keeping a code editor open.
3. **Chrome Browser Extension (Manifest V3)** — adds 1-click tab capture to clipboard plus double-tap zoom & PDF sentence highlighting directly inside any webpage.

> **Important Browser Security Requirement (`HTTPS` vs `localhost`)**
> Screen capture (`navigator.mediaDevices.getDisplayMedia`), microphone access (`getUserMedia`), Service Workers (PWA), and direct clipboard PNG writes (`navigator.clipboard.write`) require a **Secure Context** — either **`http://localhost`** / **`http://127.0.0.1`** or **`https://`**. Always access FrameDeck via `http://localhost:3000` (not `http://192.168.x.x:3000`) when running locally on your laptop, or host it behind HTTPS.

---

## Option 1: Install as a Standalone Desktop App (PWA)

FrameDeck ships with a preconfigured **Web App Manifest** and **Workbox Service Worker** (`vite-plugin-pwa`).

### From Localhost (`http://localhost:3000`) or Hosted HTTPS URL

1. Start FrameDeck (see Option 2 below) and open `http://localhost:3000` in **Google Chrome** or **Microsoft Edge** (or open your deployed HTTPS URL).
2. Click the **`Extension`** tab in FrameDeck's top navigation bar, then click **`Install FrameDeck Desktop App`** — **OR** click the **Install icon** in the right side of the browser address bar (`Cast, save, and share` → `Install FrameDeck`).
3. Confirm the install prompt.
4. FrameDeck now opens in its own dedicated window without browser tabs or URL chrome, and appears in:
   - **Windows**: Start Menu & Desktop/Taskbar shortcut
   - **macOS**: `~/Applications/Chrome Apps.app` (or Dock)
   - **Linux**: Application Launcher (`.desktop` entry created by Chrome/Edge)

### Installing on macOS Safari (Sonoma+)

1. Open FrameDeck in Safari.
2. Click **File → Add to Dock…** (or **Share → Add to Dock**).

---

## Option 2: Run FrameDeck Permanently on Your Laptop

Building and serving the static production bundle uses minimal RAM/CPU and works offline once installed as a PWA.

### Step 1: Build the Production Bundle

```bash
npm install
npm run build
```

This outputs the optimized static app (including the PWA Service Worker and Chrome Extension files) into the `dist/` directory.

### Step 2: Serve `dist/` Locally on Port `3000`

You can use Vite's built-in preview server or any static HTTP server (`serve`, `caddy`, `nginx`):

```bash
# Built-in Vite preview on port 3000
npx vite preview --port 3000 --host 127.0.0.1
```

Or install `serve` globally so you can launch it from anywhere:

```bash
npm install -g serve
serve -s dist -l tcp://127.0.0.1:3000
```

### Step 3 (Optional): Auto-Start on Laptop Boot

#### Windows (Startup Folder Batch Script)
Create a file named `start-framedeck.vbs` inside `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\`:

```vbscript
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d C:\path\to\framedeck && npx vite preview --port 3000 --host 127.0.0.1", 0, False
```

#### macOS (`launchd` User Agent)
Create `~/Library/LaunchAgents/com.framedeck.studio.plist` (replace paths with your Node binary and project directory):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.framedeck.studio</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/npx</string>
    <string>vite</string>
    <string>preview</string>
    <string>--port</string>
    <string>3000</string>
    <string>--host</string>
    <string>127.0.0.1</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/Users/YOUR_USER/path/to/framedeck</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
```

Load it immediately:
```bash
launchctl load ~/Library/LaunchAgents/com.framedeck.studio.plist
```

#### Linux (`systemd --user`)
Create `~/.config/systemd/user/framedeck.service`:

```ini
[Unit]
Description=FrameDeck Local Studio Server
After=network.target

[Service]
WorkingDirectory=/home/YOUR_USER/path/to/framedeck
ExecStart=/usr/bin/npx vite preview --port 3000 --host 127.0.0.1
Restart=always

[Install]
WantedBy=default.target
```

Enable and start it:
```bash
systemctl --user daemon-reload
systemctl --user enable --now framedeck.service
```

---

## Option 3: Install the Chrome Browser Extension

You can install the extension either directly from this repository (`public/extension/`) or by downloading the packaged `.zip` inside the running FrameDeck app:

1. In FrameDeck, open the **`Extension`** tab and click **`Download Chrome Extension (.zip)`**, then unzip `framedeck-chrome-extension.zip` to a permanent folder on your laptop (e.g., `~/Apps/framedeck-chrome-extension`).
   *(Alternatively, point Chrome directly to the `public/extension` folder in this repository.)*
2. Open **`chrome://extensions`** in Chrome (or `edge://extensions` in Edge).
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `framedeck-chrome-extension` folder.
5. Pin **FrameDeck** to your browser toolbar.
6. *(Optional)* Click the extension icon and set **Studio App URL** to match where you run FrameDeck (default: `http://localhost:3000`).

See [`public/extension/README.md`](./public/extension/README.md) for extension shortcuts and troubleshooting.

---

## OS Permissions Checklist (Laptop Setup)

- **macOS (`System Settings → Privacy & Security`)**:
  - Enable **Screen & System Audio Recording** for Google Chrome / Edge (and the FrameDeck Desktop PWA if prompted).
  - Enable **Microphone** for Google Chrome / Edge.
  - Restart the browser once after granting Screen Recording permission.
- **Windows 10/11 (`Settings → Privacy & security`)**:
  - Ensure **Microphone access** and **Let desktop apps access your microphone** are turned **On**.
  - When capturing **System Audio**, select a browser **Tab** or **Entire Screen** in the Chrome picker and check **"Also share system audio"**.
- **Linux (Wayland / X11)**:
  - On Wayland, ensure `xdg-desktop-portal` + `pipewire` are running so Chrome/Edge can capture screens and system audio.
