# dsh-plugin-genshin-startup 🚀✨

An official-architecture plugin for **DeepSeek Harness (`dsh`)**.

When launching `dsh web`, it plays the **Genshin Impact Launch** ("原神，启动！") opening video in **autofullscreen**, perfectly **centered without stretching**, and fills all surrounding empty letterbox/pillarbox space with **pure white** (`#ffffff`), before smoothly fading into the main Harness agent workspace.

---

## ✨ Features

- 🖥️ **Autofullscreen & Centered**: Plays in fullscreen, preserving native aspect ratio with `object-fit: contain` without stretching.
- ⚪ **Pure White Fill**: Pure white background (`#ffffff`) fills the entire surrounding screen space.
- ⚡ **Instant Skip**: Press <kbd>Esc</kbd>, <kbd>Space</kbd>, or click the floating **Skip** button anytime to instantly enter the workspace.
- 🔊 **Autoplay & Audio Policy Fallback**: Attempts unmuted playback; displays an interactive sound button if restricted by browser security policies.
- 🧩 **Native DeepSeek Harness Plugin**: Follows the DSH `dsh.bundle` patch layer and lazy CJS `dsh.client` architecture.

---

## 🛠️ How It Is Installed

The plugin is registered as a profile layer in your DeepSeek Harness environment using the official CLI:

```bash
dsh plugin --profile web add /path/to/dsh-plugin-genshin-startup
```

This adds the plugin to `$DSH_HOME/profiles/web` and mounts the `cordis.patch.yml` layer.

---

## 🚀 Running DeepSeek Harness

Launch the Web UI as usual:

```bash
npx @deepseek-ai/dsh web
```

Or if using global `dsh`:

```bash
dsh web
```

Open `http://127.0.0.1:3080` in your browser. The Genshin Impact startup animation will play automatically before transitioning into your agent workspace!

---

## 📦 Package Structure

```
.
├── cordis.patch.yml          # DSH profile bundle patch layer
├── lib/
│   ├── index.js              # Host-side entry
│   └── client.js             # DSH lazy CJS client module
├── assets/
│   ├── genshin-launch.mp4    # Fast-start optimized video asset
│   ├── genshin-launch.mov    # Original high-res recording
│   ├── genshin-launch.js     # Standalone runtime
│   └── genshin-launch.css    # Fullscreen overlay styling
├── demo.html                 # Standalone preview page
├── package.json
└── README.md
```

---

## 📜 License

MIT License © 2026 Allen Sun
