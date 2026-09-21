# UltraX — AI-Native Touchless Control & Spatial Interaction Hub

**UltraX** (UltraTouch) is an AI-native spatial interaction platform and touchless control hub designed for **NitroStack**. Built with **Next.js**, **Three.js**, **MediaPipe**, and **Web Audio API**, UltraX enables hands-free device management, live data navigation, and spatial controls using real-time computer vision hand tracking, ADB Android hardware integration, and spatial audio feedback.

Designed for sterile and high-hygiene environments (hospitals, operating rooms, cleanrooms, industrial kitchens) as well as users with limited mobility or dexterity.

---

## 🌟 Key Features

- **Spatial 3D Canvas**: Ambient floating frosted-glass UI built with Three.js, complete with particle fields, bloom, and chromatic aberration post-processing.
- **5-Gesture Computer Vision Vocabulary**:
  - 🤏 **Single-Hand Pinch & Drag**: Smooth panel scrubbing & navigation
  - 👐 **Two-Hand Pinch & Zoom**: Depth zoom in/out of details
  - ✋ **Open Palm (Hold)**: Select focused items
  - ✊ **Fist**: Cancel action / go back
  - ☝️ **Point (Hold)**: Direct device state toggle
- **Dynamic ADB Android Device Integration**: Real-time integration via Next.js API routes interfacing with `adb` to discover physical Android devices and dispatch remote keyevent commands (Play/Pause, Lock/Unlock, Volume Control).
- **Audio-Reactive Sonification Engine**: Web Audio API synthesizer generating distinct multi-frequency acoustic signatures for hover, selection, toggle, and error states — serving as an auditory accessibility backbone.
- **Full Keyboard Fallback**: Accessible keyboard navigation (`←` `→` `↑` `↓` `Enter` `Esc` `G` `M`) for non-webcam environments.
- **NitroStack MCP Server Integration**: Compatible with MCP (Model Context Protocol) tool servers for AI agentic orchestration, pizza/order automation, and hardware auditing.

---

## 🛠️ Architecture & Core Modules

```
sample-apps/ultraX/
├── app/
│   ├── api/
│   │   ├── android/route.ts      # ADB hardware interface & device command dispatcher
│   │   └── voice/route.ts        # Voice & speech processing API endpoints
│   ├── layout.tsx                # Next.js app shell
│   ├── page.tsx                  # Application main entry point
│   └── globals.css               # Design system & neon floating UI tokens
├── components/
│   ├── UltraTouch.tsx            # Central state & gesture-to-UI orchestrator
│   ├── StatusBar.tsx             # Floating top navigation with glowing aura
│   ├── DataPanel.tsx              # Live telemetry & spatial metric feed
│   ├── DevicePanel.tsx            # Smart device & ADB hardware controls
│   ├── ActivityPanel.tsx          # Real-time event log
│   ├── CameraPreview.tsx          # MediaPipe webcam feed & gesture debugging
│   └── GestureGuide.tsx           # Interactive gesture cheat sheet modal
├── lib/
│   ├── handTracker.ts            # MediaPipe HandLandmarker wrapper with hysteresis
│   ├── gestureClassifier.ts      # Discrete gesture recognition engine
│   ├── audioEngine.ts            # Web Audio API spatial synthesizer
│   ├── sceneEngine.ts            # Three.js 3D scene & post-processing manager
│   ├── mockDataFeed.ts           # Live metric feeds
│   └── mockDeviceState.ts         # ADB device polling & state manager
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- *(Optional)* **Android Debug Bridge (`adb`)**: Required only for physical Android device hardware control.

### Installation & Execution

1. Navigate to the project directory:
   ```bash
   cd sample-apps/ultraX/NitroHack
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎮 Controls Reference

### 🖐️ Hand Gestures (Webcam)

Press **`G`** or click the camera icon in the top navigation bar to enable MediaPipe hand tracking:

| Gesture | Action |
| :--- | :--- |
| **Pinch (Thumb + Index) + Drag** | Scrub between panels |
| **Two-Hand Pinch (Spread / Close)** | Zoom into / out of panel detail view |
| **Open Palm (Hold)** | Select focused item |
| **Fist** | Cancel / navigate back |
| **Point (Hold)** | Toggle smart device state directly |

### ⌨️ Keyboard Fallback

| Key | Action |
| :--- | :--- |
| `←` `→` | Switch active panels |
| `↑` `↓` | Navigate items within panel |
| `Enter` / `Space` | Select / toggle item |
| `Escape` | Cancel / zoom out |
| `G` | Toggle hand gesture tracking |
| `M` | Mute / unmute spatial audio synthesizer |
| `?` | Toggle gesture guide |

---

## ♿ Accessibility & Safety

- **Redundant Audio Feedback**: Every spatial interaction triggers a unique synthesized sound so sight-impaired users receive tactile acoustic feedback.
- **Gesture Hysteresis**: Robust temporal framing prevents false gesture triggers.
- **ARIA Live Support**: Screen-reader friendly DOM landmarks and live regions.
- **Webcam-Free Operation**: Full functionality accessible via keyboard navigation.

---

## 📄 License

MIT License
