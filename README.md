# AR Laser Lab

An interactive, web-based 3D simulation for experimenting with lasers, optics, and light manipulation. Build complex paths, split beams with prisms, and explore an infinite workspace.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Three.js](https://img.shields.io/badge/Three.js-r184-black.svg)
![Vite](https://img.shields.io/badge/Vite-8.0-646CFF.svg)

## 🚀 Features

- **Interactive Optics:**
  - **Laser Emitters:** High-intensity light sources with adjustable horizontal and vertical angles.
  - **Mirrors:** Reflect beams based on the angle of incidence.
  - **Prisms:** Split a single beam into three distinct paths.
  - **Absorbers:** Stop beams completely to manage light flow.
- **Advanced Workspace:**
  - **Infinite Grid Mode:** Toggleable infinite workspace that follows your view.
  - **3D Navigation:** Full 360-degree orbit and pan controls.
  - **Save/Load:** Persist your optical configurations to local storage.
  - **Theme Support:** Switch between Dark and Light modes for comfortable viewing.
- **Visual Effects:** Effects using Three.js post-processing.
- Gyroscope navigation on mobile 

## 🎮 Controls

### Camera Navigation
- **Rotate:** Left-click and drag.
- **Zoom:** Mouse wheel or **Arrow Up/Down**.
- **Pan:** **W, A, S, D** keys (available in 3D mode).

### Object Manipulation
- **Select:** Click an object to open its rotation settings.
- **Delete:** Toggle the **Delete** mode in the inventory and click objects to remove them.
- **Rotate:** Use the sliders in the control panel to adjust Horizontal and Vertical angles for Lasers and Mirrors.

## 🛠️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sarwesv/3D-Laser-Lab.git
   cd 3D-Laser-Lab
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## 🌐 Deployment

The project is configured for easy deployment with Vite. Simply run `npm run build` and deploy the `dist` folder to any static hosting provider (GitHub Pages, Vercel, Netlify, etc.). You can also run it by pressing [HERE](https://sarwesv.github.io/3D-Laser-Lab/)

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---
Created by [Sarwesv](https://github.com/sarwesv)
