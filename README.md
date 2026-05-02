# 3D Laser Lab 🔦

An interactive, web-based 3D optics simulation with Augmented Reality features. Built with **Three.js** and **Vite**.

[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF.svg)](https://vitejs.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r184-black.svg)](https://threejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> A physics-based 3D optics simulator for learning and experimentation with lasers, mirrors, and light manipulation.

## 📋 Table of Contents
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Controls](#-controls)
- [Tech Stack](#-tech-stack)
- [Live Demo](#-live-demo)
- [Requirements](#-requirements)
- [Installation & Setup](#-installation--setup)
- [Project Structure](#-project-structure)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

## 🌟 Overview

3D Laser Lab allows you to build intricate optical paths using lasers, mirrors, and prisms. Whether you're exploring the physics of reflection in **Sandbox mode**, solving hand-crafted **Challenges**, or racing against the clock, this simulation brings optics to life with intuitive 3D controls and AR capabilities. Perfect for students, educators, and physics enthusiasts.

## 🚀 Key Features

- **Advanced Optics Engine:**
  - **Laser Emitters:** Adjustable source beams with horizontal and vertical rotation.
  - **Mirrors:** High-reflectivity surfaces for precision redirection.
  - **Prisms:** Triple-ray beam splitters for complex routing.
  - **Concave Lenses:** Radial divergence optics for wide-angle beam manipulation.
  - **Absorbers:** Tactical blocks to manage stray light.

- **Game Modes:**
  - **Sandbox:** Infinite workspace for free-form experimentation.
  - **Challenges:** Solve 7 progressive levels designed to test your logic.
  - **Racing:** Compete for the fastest completion time.

- **Immersive Workspace:**
  - **AR-Ready Gyroscope:** Use your mobile device's sensors to walk through your 3D creation.
  - **Infinite Grid:** Toggleable grid that follows the camera for unlimited building space.
  - **Bloom & Glow:** Realistic light scattering and beam intensity using Three.js post-processing.
  - **Progress Tracking:** Automatic local storage persistence for unlocked levels.

## 🎮 Controls

### Camera & Navigation
- **Orbit/Rotate:** Left-click and drag (Desktop) or single-finger drag (Mobile).
- **Zoom:** Mouse wheel or **Arrow Up/Down**.
- **Pan:** **W, A, S, D** keys to move the camera target.
- **AR Mode:** Tap the 📱 icon on mobile to enable gyroscope-based walking navigation.

### Building & Editing
- **Place:** Select an item from the dock and click/tap the grid.
- **Move:** Drag any placed object to reposition it.
- **Rotate:** Select an object to reveal the Horizontal and Vertical rotation sliders.
- **Delete:** Toggle the 🗑️ icon and tap objects to remove them.

## 🛠️ Tech Stack

- **Core:** [Three.js](https://threejs.org/) (3D Rendering)
- **Tooling:** [Vite](https://vitejs.dev/) (Build System)
- **FX:** [EffectComposer](https://threejs.org/docs/#examples/en/postprocessing/EffectComposer) (UnrealBloomPass)
- **Styling:** Vanilla CSS with Glassmorphism principles.

## 🌐 Live Demo

**[Try it now!](https://sarwesv.github.io/3D-Laser-Lab/)** No installation required—runs entirely in your browser with GitHub Pages hosting.

## 📋 Requirements

- Node.js 16 or higher
- npm or yarn package manager
- Modern web browser with WebGL support (Chrome, Firefox, Safari, Edge)

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sarwesv/3D-Laser-Lab.git
   cd 3D-Laser-Lab
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Development Mode:**
   ```bash
   npm run dev
   ```
   Then open [http://localhost:5173](http://localhost:5173) in your browser.

4. **Production Build:**
   ```bash
   npm run build
   ```

## 📁 Project Structure

```
src/
├── components/     # UI components and interface
├── scenes/         # 3D scene setup and management
├── optics/         # Laser physics and optical calculations
├── levels/         # Challenge level definitions
├── utils/          # Helper functions and utilities
└── styles/         # CSS stylesheets
```

## ❓ Troubleshooting

**AR mode not working?**
- Ensure you're on a mobile device with gyroscope support (iOS/Android).
- Grant permission for device motion when prompted.

**Performance issues?**
- Try disabling bloom effects in the settings menu.
- Reduce the grid resolution or lower your browser's rendering quality.
- Close other browser tabs to free up GPU resources.

**Laser beam not rendering?**
- Ensure WebGL is enabled in your browser settings.
- Try a different browser or clear your browser cache.

## 🤝 Contributing

Contributions are welcome! Feel free to fork this repository and submit pull requests with improvements, bug fixes, or new features. Please follow the existing code style and add tests for new functionality.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
Created by [Sarwesv](https://github.com/sarwesv)