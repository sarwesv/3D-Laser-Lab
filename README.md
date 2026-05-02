# 3D Laser Lab 🔦

An interactive, web-based 3D optics simulation with Augmented Reality features. Built with **Three.js** and **Vite**.

[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF.svg)](https://vitejs.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r184-black.svg)](https://threejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🌟 Overview

3D Laser Lab allows you to build intricate optical paths using lasers, mirrors, and prisms. Whether you're exploring the physics of reflection in **Sandbox mode**, solving hand-crafted **Challenges**, or competing for the best time in **Racing mode**, the lab provides a tactile and visually stunning environment.

## 🚀 Key Features

- **Advanced Optics Engine:**
  - **Laser Emitters:** Adjustable source beams with horizontal and vertical rotation.
  - **Mirrors:** High-reflectivity surfaces for precision redirection.
  - **Prisms:** Triple-ray beam splitters for complex routing.
  - **Concave Lenses:** Radial divergence optics for wide-angle beam manipulation.
  - **Absorbers:** Tactical blocks to manage stray light.

## 🛠️ Developer Tools
Access the browser console (F12) to use these helper commands:
- `window.skipLevel()`: Instantly advance to the next challenge.
- `window.loadLevel(index)`: Jump to a specific level.

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

Experience the lab directly in your browser: [3D Laser Lab](https://sarwesv.github.io/3D-Laser-Lab/)



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

4. **Production Build:**
   ```bash
   npm run build
   ```


## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---
Created by [Sarwesv](https://github.com/sarwesv)

