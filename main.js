import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

let container;
let camera, scene, renderer, composer;

let reticle;

let selectedItemType = null;
let isDeleteMode = false;
let isLaserActive = false;
let ghostObject = null;
let laserBeams = []; 
let floor, grid;
let is3DMode = false;
let is3DListenersAttached = false;
let isDragging = false;
let keys = {};
let cameraOrbit = { theta: Math.PI / 4, phi: Math.PI / 4, radius: 3 };
let cameraTarget = new THREE.Vector3(0, 0, 0);
let isInfiniteGrid = false;

let selectedObject = null;
let objects = [];
let targetObjects = [];
let previousMouse = { x: 0, y: 0 };
let currentRotationH = 0;
let currentRotationV = 0;
let laserSpeed = 4.0;
let allPaths = []; 

// Gamification State
let currentMode = 'sandbox'; 
let currentLevelIndex = 0;
let unlockedLevelIndex = parseInt(localStorage.getItem('unlockedLevelIndex') || '0');
let isLevelCompleting = false;
let inventoryCounts = {
  laser: Infinity,
  mirror: Infinity,
  prism: Infinity,
  absorber: Infinity
};

const levels = [
  {
    title: "Level 1: The Basics",
    instructions: "Place a laser emitter to hit the target directly.",
    hint: "Click the Laser icon and place it so it points directly at the target.",
    inventory: { laser: 1, mirror: 0, prism: 0, absorber: 0 },
    targets: [{ pos: [0, 0.1, -2] }],
    fixedObjects: []
  },
  {
    title: "Level 2: Reflection",
    instructions: "A laser is blocked! Use a mirror to redirect it to the target.",
    hint: "Place a mirror before the beam hits the obstacle, then rotate it 45 degrees.",
    inventory: { laser: 0, mirror: 1, prism: 0, absorber: 0 },
    targets: [{ pos: [-1, 0.1, 2] }],
    fixedObjects: [
      { type: 'laser', pos: [-2, 0.05, 0], rotH: Math.PI/2, rotV: 0, fixed: true },
      { type: 'absorber', pos: [0, 0.075, 0], fixed: true }
    ]
  },
  {
    title: "Level 3: Splitting",
    instructions: "Use a prism to hit both targets simultaneously.",
    hint: "The prism splits light into 3 rays. Place it in the path of the main beam.",
    inventory: { laser: 0, mirror: 0, prism: 1, absorber: 0 },
    targets: [
      { pos: [1.5, 0.1, -1.5] },
      { pos: [1.5, 0.1, 1.5] }
    ],
    fixedObjects: [
      { type: 'laser', pos: [-2, 0.05, 0], rotH: Math.PI/2, rotV: 0, fixed: true }
    ]
  },
  {
    title: "Level 4: Zig-Zag",
    instructions: "Use mirrors to navigate around the barriers to the target.",
    hint: "Bounce the beam around the first wall, then use more mirrors to aim at the target.",
    inventory: { laser: 0, mirror: 3, prism: 0, absorber: 0 },
    targets: [{ pos: [-2, 0.1, -2] }],
    fixedObjects: [
      { type: 'laser', pos: [-2, 0.05, 2], rotH: 0, rotV: 0, fixed: true },
      { type: 'absorber', pos: [-2, 0.075, 0.5], fixed: true },
      { type: 'absorber', pos: [0, 0.075, -1], fixed: true }
    ]
  },
  {
    title: "Level 5: The Perimeter",
    instructions: "The target is far away. Use mirrors to bounce light along the edges.",
    hint: "Keep the beam close to the grid edges to avoid missing the long-distance target.",
    inventory: { laser: 0, mirror: 3, prism: 0, absorber: 0 },
    targets: [{ pos: [4, 0.1, 4] }],
    fixedObjects: [
      { type: 'laser', pos: [-4, 0.05, -4], rotH: 0, rotV: 0, fixed: true }
    ]
  },
  {
    title: "Level 6: Web of Light",
    instructions: "Split the beam and then reflect both rays into the targets.",
    hint: "Place the prism near the laser, then use mirrors to redirect the side rays.",
    inventory: { laser: 0, mirror: 2, prism: 1, absorber: 0 },
    targets: [
      { pos: [-3, 0.1, -3] },
      { pos: [3, 0.1, -3] }
    ],
    fixedObjects: [
      { type: 'laser', pos: [0, 0.05, 3], rotH: Math.PI, rotV: 0, fixed: true }
    ]
  }
];

function generateRandomLevel(index) {
  const numMirrors = Math.min(1 + Math.floor((index - 6) / 2), 6);
  const numObstacles = Math.min(index - 6, 8);
  const gridSize = 1;
  const bounds = 4; // -4 to 4

  // Helper to snap to grid
  const snap = (v) => Math.round(v / gridSize) * gridSize;

  // 1. Place fixed laser emitter
  const side = Math.floor(Math.random() * 4);
  let laserPos, laserRotH;
  if (side === 0) { laserPos = [-bounds, 0.05, snap((Math.random() * 2 - 1) * bounds)]; laserRotH = -Math.PI/2; }
  else if (side === 1) { laserPos = [bounds, 0.05, snap((Math.random() * 2 - 1) * bounds)]; laserRotH = Math.PI/2; }
  else if (side === 2) { laserPos = [snap((Math.random() * 2 - 1) * bounds), 0.05, -bounds]; laserRotH = Math.PI; }
  else { laserPos = [snap((Math.random() * 2 - 1) * bounds), 0.05, bounds]; laserRotH = 0; }

  // 2. Simulate path to place target
  let currentPos = new THREE.Vector3(laserPos[0], 0.05, laserPos[2]);
  let currentDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), laserRotH).normalize();
  const pathSegments = [];

  for (let i = 0; i < numMirrors; i++) {
    const dist = Math.floor(Math.random() * 3 + 2) * gridSize;
    const nextPos = currentPos.clone().add(currentDir.clone().multiplyScalar(dist));
    
    // Keep within bounds
    if (Math.abs(nextPos.x) > bounds || Math.abs(nextPos.z) > bounds) break;
    
    pathSegments.push({ start: currentPos.clone(), end: nextPos.clone() });
    currentPos.copy(nextPos);
    
    // Turn 90 degrees
    const axis = new THREE.Vector3(0, 1, 0);
    const angle = (Math.random() > 0.5 ? 1 : -1) * Math.PI / 2;
    currentDir.applyAxisAngle(axis, angle);
  }
  
  // Final segment
  const finalDist = Math.floor(Math.random() * 2 + 1) * gridSize;
  const targetPosVec = currentPos.clone().add(currentDir.clone().multiplyScalar(finalDist));
  pathSegments.push({ start: currentPos.clone(), end: targetPosVec.clone() });

  // 3. Generate obstacles that don't block the path
  const obstacles = [];
  for (let i = 0; i < numObstacles; i++) {
    const obsPos = [snap((Math.random() * 2 - 1) * bounds), 0.075, snap((Math.random() * 2 - 1) * bounds)];
    // Check if obstacle is too close to any path segment
    const isSafe = pathSegments.every(seg => {
      const p = new THREE.Vector3(obsPos[0], 0.05, obsPos[2]);
      const line = new THREE.Line3(seg.start, seg.end);
      const closest = new THREE.Vector3();
      line.closestPointToPoint(p, true, closest);
      return p.distanceTo(closest) > 0.5;
    });
    // And not on laser or target
    const distToLaser = Math.sqrt((obsPos[0]-laserPos[0])**2 + (obsPos[2]-laserPos[2])**2);
    const distToTarget = Math.sqrt((obsPos[0]-targetPosVec.x)**2 + (obsPos[2]-targetPosVec.z)**2);
    
    if (isSafe && distToLaser > 0.5 && distToTarget > 0.5) {
      obstacles.push({ type: 'absorber', pos: obsPos, fixed: true });
    }
  }

  return {
    title: `Level ${index + 1}: Random Challenge`,
    instructions: `Navigate the beam using ${numMirrors} mirror${numMirrors > 1 ? 's' : ''}.`,
    hint: `Follow the laser beam and place your first mirror where it needs to turn to reach the target.`,
    inventory: { laser: 0, mirror: numMirrors, prism: 0, absorber: 0 },
    targets: [{ pos: [targetPosVec.x, 0.1, targetPosVec.z] }],
    fixedObjects: [
      { type: 'laser', pos: laserPos, rotH: laserRotH, rotV: 0, fixed: true },
      ...obstacles
    ]
  };
}

let currentLevelHint = "";

init();
animate();

function showNotification(message) {
  const container = document.getElementById('notification-container');
  if (!container) return;
  
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.innerText = message;
  
  container.appendChild(notification);
  
  // Remove after animation finishes
  setTimeout(() => {
    if (notification.parentElement) {
      container.removeChild(notification);
    }
  }, 3000);
}

function init() {
  container = document.getElementById('container');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f7fa);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.0,
    0.3,
    0.9
  );
  composer.addPass(bloomPass);

  const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthTest: false });
  reticle = new THREE.Mesh(geometry, material);
  reticle.position.y = 0.02; // Lift above floor and grid
  reticle.renderOrder = 999;
  reticle.visible = false;
  scene.add(reticle);

  document.querySelectorAll('.inventory-item').forEach(item => {
    item.addEventListener('click', () => {
      if (item.id === 'btn-delete') {
        isDeleteMode = !isDeleteMode;
        item.classList.toggle('active', isDeleteMode);
        if (isDeleteMode) {
          selectedItemType = null;
          document.querySelectorAll('.inventory-item').forEach(i => {
            if (i.id !== 'btn-delete') i.style.background = '';
          });
          removeGhost();
        }
        return;
      }
      selectedItemType = (selectedItemType === item.dataset.type) ? null : item.dataset.type;
      if (selectedItemType) {
        isDeleteMode = false;
        selectedObject = null;
        document.getElementById('btn-delete').classList.remove('active');
        document.getElementById('rotation-container').style.display = 'none';
      }
      document.querySelectorAll('.inventory-item').forEach(i => {
        i.classList.remove('active');
      });
      if (selectedItemType) {
        item.classList.add('active');
        updateGhost();
      } else {
        removeGhost();
      }
    });
  });

  document.getElementById('btn-start').addEventListener('click', () => {
    const hasLaser = objects.some(o => o.userData.type === 'laser');
    if (!isLaserActive && !hasLaser) {
      showNotification('Please place at least one Laser Emitter first!');
      return;
    }
    isLaserActive = !isLaserActive;
    const btn = document.getElementById('btn-start');
    btn.textContent = isLaserActive ? 'Stop Laser' : 'Start Laser';
    btn.classList.toggle('active', isLaserActive);
    updateLaser();
  });

  document.getElementById('btn-grid-toggle').addEventListener('click', () => {
    isInfiniteGrid = !isInfiniteGrid;
    const btn = document.getElementById('btn-grid-toggle');
    btn.classList.toggle('active', isInfiniteGrid);
    showNotification(isInfiniteGrid ? 'Grid: Infinite' : 'Grid: Fixed');
    if (!isInfiniteGrid && grid && floor) {
      grid.position.set(0, 0, 0);
      floor.position.set(0, 0, 0);
    } else {
      updateInfiniteGrid();
    }
  });

  document.getElementById('top-trigger').addEventListener('click', () => {
    document.getElementById('status-panel').classList.remove('hidden');
    document.getElementById('actions-container').classList.remove('hidden');
    document.getElementById('top-trigger').classList.remove('active');
  });

  document.getElementById('btn-clear').addEventListener('click', () => {
    if (window.confirm('Are you sure you want to clear all objects? This cannot be undone.')) {
      clearAll();
      if (currentMode === 'challenges') {
        window.loadLevel(currentLevelIndex);
      }
    }
  });

  const btnSandbox = document.getElementById('btn-mode-sandbox');
  const btnChallenges = document.getElementById('btn-mode-challenges');
  const levelOverlay = document.getElementById('level-info');

  window.updateInventoryUI = () => {
    Object.keys(inventoryCounts).forEach(type => {
      const item = document.getElementById(`item-${type}`);
      if (!item) return;
      let badge = item.querySelector('.item-count');
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'item-count';
        item.appendChild(badge);
      }
      if (currentMode === 'challenges') {
        badge.style.display = 'block';
        badge.innerText = inventoryCounts[type];
        if (inventoryCounts[type] <= 0) {
          item.style.opacity = '0.4';
          item.style.pointerEvents = 'none';
        } else {
          item.style.opacity = '1';
          item.style.pointerEvents = 'auto';
        }
      } else {
        badge.style.display = 'none';
        item.style.opacity = '1';
        item.style.pointerEvents = 'auto';
      }
    });
  };

  window.loadLevel = (index) => {
    isLevelCompleting = false;
    clearAll();
    currentLevelIndex = index;
    const level = levels[index] || generateRandomLevel(index);
    currentLevelHint = level.hint || "No hint available for this level.";
    
    document.getElementById('level-title').innerText = level.title;
    document.getElementById('level-instructions').innerText = level.instructions;
    levelOverlay.style.display = 'block';
    document.getElementById('btn-hint').style.display = 'inline-block';
    inventoryCounts = { ...level.inventory };
    window.updateInventoryUI();
    level.targets.forEach(t => {
      const geom = new THREE.SphereGeometry(0.15, 16, 16);
      const mat = new THREE.MeshStandardMaterial({ color: 0x444444, emissive: 0x000000, roughness: 0.5 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(t.pos[0], t.pos[1], t.pos[2]);
      mesh.userData.isTarget = true;
      mesh.userData.active = false;
      scene.add(mesh);
      targetObjects.push(mesh);
    });
    level.fixedObjects.forEach(o => {
      currentRotationH = o.rotH || 0;
      currentRotationV = o.rotV || 0;
      placeObject(o.type, null, o.pos, null, o.fixed);
    });
    currentRotationH = 0;
    currentRotationV = 0;
    if (level.fixedObjects.some(o => o.type === 'laser')) {
      isLaserActive = true;
      const btn = document.getElementById('btn-start');
      btn.textContent = 'Stop Laser';
      btn.classList.add('active');
    }
    updateLaser();
  };

  btnSandbox.addEventListener('click', () => {
    currentMode = 'sandbox';
    btnSandbox.classList.add('active');
    btnChallenges.classList.remove('active');
    levelOverlay.style.display = 'none';
    document.getElementById('btn-hint').style.display = 'none';
    inventoryCounts = { laser: Infinity, mirror: Infinity, prism: Infinity, absorber: Infinity };
    window.updateInventoryUI();
    clearAll();
  });

  btnChallenges.addEventListener('click', () => {
    currentMode = 'challenges';
    btnChallenges.classList.add('active');
    btnSandbox.classList.remove('active');
    window.loadLevel(currentLevelIndex);
  });

  document.getElementById('btn-hint').addEventListener('click', () => {
    if (currentLevelHint) {
      showNotification(`Hint: ${currentLevelHint}`);
    }
  });

  document.getElementById('btn-help').addEventListener('click', () => {
    const helpSteps = [
      "Welcome to 3D Laser Lab!",
      "1. Select a LASER 🔦 from the dock and click on the floor to place it.",
      "2. Select a MIRROR 🪞 and place it in the laser's path.",
      "3. Click a placed mirror to see ROTATION SLIDERS in the bottom-right.",
      "4. Click START to fire the laser and see if you hit the target!",
      "Try making a simple L-shape bounce with 1 mirror!"
    ];
    
    let step = 0;
    const showNextStep = () => {
      if (step < helpSteps.length) {
        showNotification(helpSteps[step]);
        step++;
        setTimeout(showNextStep, 4000);
      }
    };
    showNextStep();
  });

  const sliderH = document.getElementById('rotation-slider-h');
  const sliderV = document.getElementById('rotation-slider-v');

  const updateRotation = () => {
    const h = parseFloat(sliderH.value) * (Math.PI / 180);
    const v = parseFloat(sliderV.value) * (Math.PI / 180);
    currentRotationH = h;
    currentRotationV = v;
    if (selectedObject) {
      if (selectedObject.userData.isFixed) return;
      selectedObject.userData.rotationH = h;
      selectedObject.userData.rotationV = v;
      selectedObject.rotation.set(0, 0, 0);
      selectedObject.rotation.order = 'YXZ';
      if (selectedObject.userData.type === 'laser') {
        selectedObject.rotation.y = h;
        selectedObject.rotation.x = Math.PI / 2 + v;
      } else if (selectedObject.userData.type === 'mirror') {
        selectedObject.rotation.y = h;
        selectedObject.rotation.x = v;
      }
      if (isLaserActive) updateLaser();
    } else if (ghostObject) {
      ghostObject.rotation.set(0, 0, 0);
      ghostObject.rotation.order = 'YXZ';
      if (selectedItemType === 'laser') {
        ghostObject.rotation.y = h;
        ghostObject.rotation.x = Math.PI / 2 + v;
      } else if (selectedItemType === 'mirror') {        ghostObject.rotation.y = h;
        ghostObject.rotation.x = v;
      }
      updateLaser(); 
    }
  };

  sliderH.addEventListener('input', updateRotation);
  sliderV.addEventListener('input', updateRotation);
  window.addEventListener('resize', onWindowResize);
  start3DMode();
}

function updateGhost() {
  removeGhost();
  let geometry, material;
  if (selectedItemType === 'laser') {
    geometry = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 16);
    material = new THREE.MeshStandardMaterial({ color: 0x222222, transparent: true, opacity: 0.5, depthTest: false });
    ghostObject = new THREE.Mesh(geometry, material);
    ghostObject.renderOrder = 999;
    document.getElementById('rotation-container').style.display = 'flex';
    document.getElementById('rotation-label-h').innerText = 'Horizontal Angle';
    document.getElementById('rotation-label-v').style.display = 'block';
    document.getElementById('rotation-slider-v').style.display = 'block';
  } else if (selectedItemType === 'mirror') {
    geometry = new THREE.BoxGeometry(0.2, 0.2, 0.02);
    material = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.5, depthTest: false });
    ghostObject = new THREE.Mesh(geometry, material);
    ghostObject.renderOrder = 999;
    document.getElementById('rotation-container').style.display = 'flex';
    document.getElementById('rotation-label-h').innerText = 'Horizontal Angle';
    document.getElementById('rotation-label-v').style.display = 'block';
    document.getElementById('rotation-slider-v').style.display = 'block';
  } else if (selectedItemType === 'prism' || selectedItemType === 'absorber') {
    if (selectedItemType === 'prism') {
      geometry = new THREE.TetrahedronGeometry(0.2);
      material = new THREE.MeshStandardMaterial({ color: 0xccffff, transparent: true, opacity: 0.5, depthTest: false });
    } else {
      geometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
      material = new THREE.MeshStandardMaterial({ color: 0x222222, transparent: true, opacity: 0.5, depthTest: false });
    }
    ghostObject = new THREE.Mesh(geometry, material);
    ghostObject.renderOrder = 999;
    document.getElementById('rotation-container').style.display = 'none';
  }
  if (ghostObject) {
    ghostObject.visible = false;
    ghostObject.rotation.order = 'YXZ';
    const sliderH = document.getElementById('rotation-slider-h');
    const sliderV = document.getElementById('rotation-slider-v');
    const h = parseFloat(sliderH.value) * (Math.PI / 180);
    const v = parseFloat(sliderV.value) * (Math.PI / 180);
    if (selectedItemType === 'laser') {
      ghostObject.rotation.y = h;
      ghostObject.rotation.x = Math.PI / 2 + v;
    } else if (selectedItemType === 'mirror') {
      ghostObject.rotation.y = h;
      ghostObject.rotation.x = v;
    }
    scene.add(ghostObject);
  }
}

function removeGhost() {
  if (ghostObject) {
    scene.remove(ghostObject);
    ghostObject = null;
    document.getElementById('rotation-container').style.display = 'none';
    if (!isLaserActive) {
      laserBeams.forEach(b => scene.remove(b));
      laserBeams = [];
    }
  }
}

function placeObject(type, matrix, savedPos = null, savedQuat = null, isFixed = false) {
  if (currentMode === 'challenges' && !isFixed) {
    if (inventoryCounts[type] <= 0) return;
    inventoryCounts[type]--;
    window.updateInventoryUI();
  }
  let geometry, material, mesh;
  if (type === 'laser') {
    geometry = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 16);
    material = new THREE.MeshStandardMaterial({ color: 0x222222 });
    mesh = new THREE.Mesh(geometry, material);
    mesh.userData.rotationH = currentRotationH;
    mesh.userData.rotationV = currentRotationV;
    if (savedPos) mesh.position.fromArray(savedPos);
    else if (matrix) mesh.position.setFromMatrixPosition(matrix);
    mesh.position.y = 0.05;
    mesh.rotation.order = 'YXZ';
    mesh.rotation.y = currentRotationH;
    mesh.rotation.x = Math.PI / 2 + currentRotationV;
  } else if (type === 'mirror') {
    geometry = new THREE.BoxGeometry(0.2, 0.2, 0.02);
    material = new THREE.MeshStandardMaterial({ color: 0x88ccff, metalness: 1, roughness: 0 });
    mesh = new THREE.Mesh(geometry, material);
    mesh.userData.rotationH = currentRotationH;
    mesh.userData.rotationV = currentRotationV;
    if (savedPos) mesh.position.fromArray(savedPos);
    else if (matrix) mesh.position.setFromMatrixPosition(matrix);
    mesh.position.y = 0.1;
    mesh.rotation.order = 'YXZ';
    mesh.rotation.y = currentRotationH;
    mesh.rotation.x = currentRotationV;
  } else if (type === 'prism' || type === 'absorber') {
    if (type === 'prism') {
      geometry = new THREE.TetrahedronGeometry(0.2);
      material = new THREE.MeshStandardMaterial({ color: 0xccffff, transparent: true, opacity: 0.7, metalness: 0.2, roughness: 0.1 });
    } else {
      geometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
      material = new THREE.MeshStandardMaterial({ color: 0x222222 });
    }
    mesh = new THREE.Mesh(geometry, material);
    if (savedPos) mesh.position.fromArray(savedPos);
    else if (matrix) mesh.position.setFromMatrixPosition(matrix);
    mesh.position.y = (type === 'prism') ? 0.08 : 0.075;
  }
  if (savedQuat) mesh.quaternion.fromArray(savedQuat);
  mesh.userData.type = type;
  mesh.userData.isFixed = isFixed;
  if (isFixed) mesh.material.emissive = new THREE.Color(0x222222);
  scene.add(mesh);
  objects.push(mesh);
  if (isLaserActive) updateLaser();
}

function updateLaser() {
  if (!isLaserActive && selectedItemType !== 'laser') {
    laserBeams.forEach(b => scene.remove(b));
    laserBeams = [];
    return;
  }
  const emitters = [];
  
  // Real emitters
  objects.filter(o => o.userData.type === 'laser').forEach(o => {
    emitters.push({ 
      pos: o.position.clone(), 
      quat: o.quaternion.clone(),
      isGhost: false 
    });
  });

  // Ghost emitter (for previewing path before placing)
  if (selectedItemType === 'laser' && ghostObject && ghostObject.visible) {
    emitters.push({ 
      pos: ghostObject.position.clone(), 
      quat: ghostObject.quaternion.clone(),
      isGhost: true 
    });
  }

  if (emitters.length === 0) {
    laserBeams.forEach(b => b.visible = false);
    return;
  }
  allPaths = [];
  const rayQueue = [];
  emitters.forEach(e => {
    const initialDir = new THREE.Vector3(0, 1, 0).applyQuaternion(e.quat).normalize();
    const emitterTip = e.pos.clone().add(initialDir.clone().multiplyScalar(0.05));
    rayQueue.push({ 
      pos: emitterTip, 
      dir: initialDir, 
      depth: 0, 
      color: 0xffffff,
      canActivate: !e.isGhost && isLaserActive // ONLY real lasers that are "ON" can activate
    });
  });
  const maxDepth = 24;
  const raycaster = new THREE.Raycaster();
  // Reset targets
  targetObjects.forEach(t => t.userData.active = false);

  while (rayQueue.length > 0 && allPaths.length < 128) {
    const { pos, dir, depth, color, canActivate } = rayQueue.shift();
    if (depth > maxDepth) continue;

    const pathPoints = [pos.clone()];
    const distances = [0];
    let currentPos = pos.clone();
    let currentDir = dir.clone();
    let totalDist = 0;

    let branchFinished = false;
    while (!branchFinished) {
      raycaster.set(currentPos, currentDir);
      const targets = [...objects.filter(o => o.userData.type !== 'laser'), ...targetObjects];
      if (floor) targets.push(floor);
      const intersects = raycaster.intersectObjects(targets);
      if (intersects.length > 0) {
        const hit = intersects[0];
        if (hit.object.userData && hit.object.userData.isTarget) {
          // ONLY activate targets if this specific ray is allowed to
          if (canActivate) {
            hit.object.userData.active = true;
          }
          totalDist += hit.distance;
          pathPoints.push(hit.point.clone());
          distances.push(totalDist);
          currentPos.copy(hit.point).add(currentDir.clone().multiplyScalar(0.01));
          continue; 
        }
        totalDist += hit.distance;
        pathPoints.push(hit.point.clone());
        distances.push(totalDist);
        if (hit.object.userData && hit.object.userData.type === 'mirror') {
          const normal = hit.face.normal.clone().applyMatrix4(new THREE.Matrix4().extractRotation(hit.object.matrixWorld));
          currentDir.reflect(normal).normalize();
          rayQueue.push({ 
            pos: hit.point.clone().add(currentDir.clone().multiplyScalar(0.001)), 
            dir: currentDir.clone(), 
            depth: depth + 1, 
            color: color,
            canActivate: canActivate 
          });
          branchFinished = true;
        } else if (hit.object.userData && hit.object.userData.type === 'prism') {
          [{ angle: -Math.PI/4, color: (color === 0xffffff) ? 0xff0000 : color }, { angle: 0, color: (color === 0xffffff) ? 0x00ff00 : color }, { angle: Math.PI/4, color: (color === 0xffffff) ? 0x0000ff : color }].forEach(split => {
            const splitDir = currentDir.clone();
            const axis = new THREE.Vector3(0, 1, 0); // Horizontal split
            splitDir.applyAxisAngle(axis, split.angle);
            rayQueue.push({ 
              pos: hit.point.clone().add(splitDir.clone().multiplyScalar(0.01)), 
              dir: splitDir, 
              depth: depth + 1, 
              color: split.color,
              canActivate: canActivate // Pass down the activation permission
            });
          });
          branchFinished = true;
        } else {
          branchFinished = true;
        }
      } else {
        totalDist += 1000;
        pathPoints.push(currentPos.clone().add(currentDir.clone().multiplyScalar(1000)));
        distances.push(totalDist);
        branchFinished = true;
      }
      if (pathPoints.length > 20) branchFinished = true;
    }
    allPaths.push({ points: pathPoints, distances: distances, color: color });
  }
  while (laserBeams.length < allPaths.length) {
    const geom = new THREE.CylinderGeometry(0.01, 0.01, 1, 8);
    geom.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const beam = new THREE.Mesh(geom, mat);
    scene.add(beam);
    laserBeams.push(beam);
  }
  while (laserBeams.length > allPaths.length) {
    const beam = laserBeams.pop();
    scene.remove(beam);
  }
  targetObjects.forEach(t => {
    if (t.userData.active) {
      t.material.color.setHex(0xffff00);
      t.material.emissive.setHex(0xaaaa00);
    } else {
      t.material.color.setHex(0x444444);
      t.material.emissive.setHex(0x000000);
    }
  });
  if (currentMode === 'challenges' && targetObjects.length > 0 && !isLevelCompleting && isLaserActive) {
    if (targetObjects.every(t => t.userData.active)) {
      isLevelCompleting = true;
      setTimeout(() => {
        showNotification('Challenge Complete! Loading next level...');
        unlockedLevelIndex = Math.max(unlockedLevelIndex, currentLevelIndex + 1);
        localStorage.setItem('unlockedLevelIndex', unlockedLevelIndex);
        window.loadLevel(currentLevelIndex + 1);
      }, 500);
    }
  }
}

function start3DMode() {
  if (is3DMode) return;
  is3DMode = true;
  const floorGeom = new THREE.PlaneGeometry(100, 100);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8 });
  floor = new THREE.Mesh(floorGeom, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  grid = new THREE.GridHelper(100, 100, 0x444444, 0x888888);
  grid.position.y = 0.01;
  scene.add(grid);
  setup3DInteractions();
}

function setup3DInteractions() {
  if (is3DListenersAttached) return;
  is3DListenersAttached = true;
  let downPos = { x: 0, y: 0 };
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  window.addEventListener('keydown', (e) => { keys[e.code] = true; });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('wheel', (e) => {
    if (!is3DMode) return;
    cameraOrbit.radius = Math.max(0.5, Math.min(20, cameraOrbit.radius + e.deltaY * 0.005));
    updateCamera();
  });
  function updateCamera() {
    camera.position.x = cameraTarget.x + cameraOrbit.radius * Math.sin(cameraOrbit.phi) * Math.cos(cameraOrbit.theta);
    camera.position.y = cameraTarget.y + cameraOrbit.radius * Math.cos(cameraOrbit.phi);
    camera.position.z = cameraTarget.z + cameraOrbit.radius * Math.sin(cameraOrbit.phi) * Math.sin(cameraOrbit.theta);
    camera.lookAt(cameraTarget);
  }
  updateCamera();
  const getMousePos = (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  };
  window.addEventListener('pointerdown', (e) => {
    if (e.target.tagName !== 'CANVAS') return;
    isDragging = true;
    previousMouse = { x: e.clientX, y: e.clientY };
    downPos = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('pointermove', (e) => {
    if (!is3DMode || e.target.tagName !== 'CANVAS') { if (!isDragging) reticle.visible = false; }
    getMousePos(e);
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(floor);
    if (intersects.length > 0) {
      reticle.visible = true;
      reticle.position.copy(intersects[0].point);
      reticle.position.y = 0.02; // Keep it lifted
    } else { reticle.visible = false; }
    if (!isDragging) return;
    const deltaX = e.clientX - previousMouse.x;
    const deltaY = e.clientY - previousMouse.y;
    cameraOrbit.theta -= deltaX * 0.01;
    cameraOrbit.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraOrbit.phi - deltaY * 0.01));
    previousMouse = { x: e.clientX, y: e.clientY };
    updateCamera();
  });
  window.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    if (Math.sqrt((e.clientX - downPos.x)**2 + (e.clientY - downPos.y)**2) < 10 && is3DMode && e.target.tagName === 'CANVAS') {
      getMousePos(e);
      raycaster.setFromCamera(mouse, camera);
      const objIntersects = raycaster.intersectObjects(objects);
      if (objIntersects.length > 0) {
        const obj = objIntersects[0].object;
        if (isDeleteMode) {
          if (obj.userData.isFixed) { showNotification("This object is fixed and cannot be removed!"); return; }
          scene.remove(obj);
          objects = objects.filter(o => o !== obj);
          if (currentMode === 'challenges') { inventoryCounts[obj.userData.type]++; window.updateInventoryUI(); }
          if (selectedObject === obj) { selectedObject = null; document.getElementById('rotation-container').style.display = 'none'; }
          if (isLaserActive) updateLaser();
          return;
        }
        if (obj.userData.type === 'laser' || obj.userData.type === 'mirror') {
          selectedObject = obj;
          selectedItemType = null;
          document.querySelectorAll('.inventory-item').forEach(i => i.style.background = '');
          removeGhost();
          
          if (obj.userData.isFixed) {
            document.getElementById('rotation-container').style.display = 'none';
            showNotification("This object is fixed and cannot be rotated.");
          } else {
            document.getElementById('rotation-container').style.display = 'flex';
            document.getElementById('rotation-slider-h').value = (obj.userData.rotationH || 0) * (180 / Math.PI);
            document.getElementById('rotation-slider-v').value = (obj.userData.rotationV || 0) * (180 / Math.PI);
          }
          return;
        }
      }
      const floorIntersects = raycaster.intersectObject(floor);
      if (selectedItemType && floorIntersects.length > 0) {
        placeObject(selectedItemType, null, floorIntersects[0].point.toArray());
      } else if (floorIntersects.length > 0) {
        // Hide top controls when clicking the grid
        document.getElementById('status-panel').classList.add('hidden');
        document.getElementById('actions-container').classList.add('hidden');
        document.getElementById('top-trigger').classList.add('active');
        
        selectedObject = null;
        document.getElementById('rotation-container').style.display = 'none';
      } else {
        selectedObject = null;
        document.getElementById('rotation-container').style.display = 'none';
      }
    }
  });
  window.update3DMovement = () => {
    if (!is3DMode) return;
    let moved = false;
    const moveSpeed = 0.05;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    if (keys['KeyW']) { cameraTarget.add(dir.clone().multiplyScalar(moveSpeed)); moved = true; }
    if (keys['KeyS']) { cameraTarget.sub(dir.clone().multiplyScalar(moveSpeed)); moved = true; }
    if (keys['KeyA']) { cameraTarget.add(right.clone().multiplyScalar(moveSpeed)); moved = true; }
    if (keys['KeyD']) { cameraTarget.sub(right.clone().multiplyScalar(moveSpeed)); moved = true; }
    if (keys['ArrowUp']) { cameraOrbit.radius -= 0.1; moved = true; }
    if (keys['ArrowDown']) { cameraOrbit.radius += 0.1; moved = true; }
    if (moved) { cameraOrbit.radius = Math.max(0.5, Math.min(20, cameraOrbit.radius)); updateCamera(); if (isInfiniteGrid) updateInfiniteGrid(); }
  };
}

function updateInfiniteGrid() {
  if (!isInfiniteGrid || !grid || !floor) return;
  const gridSize = 1; 
  grid.position.x = Math.floor(cameraTarget.x / gridSize) * gridSize;
  grid.position.z = Math.floor(cameraTarget.z / gridSize) * gridSize;
  floor.position.x = grid.position.x;
  floor.position.z = grid.position.z;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  if (window.update3DMovement) window.update3DMovement();
  if (isLaserActive) updateLaser();
  if (ghostObject) {
    if (reticle.visible) {
      ghostObject.visible = true;
      ghostObject.position.copy(reticle.position);
      if (selectedItemType === 'laser') ghostObject.position.y = 0.05;
      else if (selectedItemType === 'mirror') ghostObject.position.y = 0.1;
      else if (selectedItemType === 'prism') ghostObject.position.y = 0.08;
      else if (selectedItemType === 'absorber') ghostObject.position.y = 0.075;
      ghostObject.updateMatrixWorld();
      updateLaser();
    } else {
      ghostObject.visible = false;
      if (!isLaserActive) { laserBeams.forEach(b => scene.remove(b)); laserBeams = []; }
    }
  }
  if ((isLaserActive || selectedItemType === 'laser') && laserBeams.length > 0 && allPaths.length > 0) {
    allPaths.forEach((path, index) => {
      const beam = laserBeams[index];
      if (!beam || path.points.length < 2) { if (beam) beam.visible = false; return; }
      beam.material.color.setHex(path.color || 0xffffff);
      const start = path.points[0];
      const end = path.points[path.points.length - 1];
      const direction = new THREE.Vector3().subVectors(end, start);
      const len = direction.length();
      beam.scale.set(1, 1, len);
      beam.position.copy(start).add(direction.clone().multiplyScalar(0.5));
      beam.lookAt(end);
      beam.visible = true;
    });
  } else if (!isLaserActive) { laserBeams.forEach(b => b.visible = false); }
  if (composer) { composer.render(); } else { renderer.render(scene, camera); }
}

function clearAll() {
  removeGhost();
  objects.forEach(o => scene.remove(o));
  objects = [];
  targetObjects.forEach(t => scene.remove(t));
  targetObjects = [];
  laserBeams.forEach(b => scene.remove(b));
  laserBeams = [];
  scene.traverse(child => {
     if (child.userData && child.userData.isTarget) {
       scene.remove(child);
     }
  });
  selectedObject = null;
  const rotationContainer = document.getElementById('rotation-container');
  if (rotationContainer) rotationContainer.style.display = 'none';
  isLaserActive = false;
  const btnStart = document.getElementById('btn-start');
  if (btnStart) { btnStart.textContent = 'Start Laser'; btnStart.classList.remove('active'); }
}
