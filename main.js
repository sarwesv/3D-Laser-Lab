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
    inventory: { laser: 1, mirror: 0, prism: 0, absorber: 0 },
    targets: [{ pos: [0, 0.1, -2] }],
    fixedObjects: []
  },
  {
    title: "Level 2: Reflection",
    instructions: "A laser is blocked! Use a mirror to redirect it to the target.",
    inventory: { laser: 0, mirror: 1, prism: 0, absorber: 0 },
    targets: [{ pos: [2, 0.1, 0] }],
    fixedObjects: [
      { type: 'laser', pos: [-2, 0.05, 0], rotH: -Math.PI/2, rotV: 0, fixed: true },
      { type: 'absorber', pos: [0, 0.075, 0], fixed: true }
    ]
  },
  {
    title: "Level 3: Splitting",
    instructions: "Use a prism to hit both targets simultaneously.",
    inventory: { laser: 0, mirror: 0, prism: 1, absorber: 0 },
    targets: [
      { pos: [1.5, 0.1, -1.5] },
      { pos: [1.5, 0.1, 1.5] }
    ],
    fixedObjects: [
      { type: 'laser', pos: [-2, 0.05, 0], rotH: -Math.PI/2, rotV: 0, fixed: true }
    ]
  }
];

init();
animate();

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
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
  reticle = new THREE.Mesh(geometry, material);
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
        if (i.id !== 'btn-delete') i.style.background = '';
      });
      if (selectedItemType) {
        item.style.background = 'rgba(255, 255, 255, 0.2)';
        updateGhost();
      } else {
        removeGhost();
      }
    });
  });

  document.getElementById('btn-start').addEventListener('click', () => {
    const hasLaser = objects.some(o => o.userData.type === 'laser');
    if (!isLaserActive && !hasLaser) {
      alert('Please place at least one Laser Emitter first!');
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
    btn.textContent = isInfiniteGrid ? '🌐 Grid: Infinite' : '🌐 Grid: Fixed';
    btn.classList.toggle('active', isInfiniteGrid);
    if (!isInfiniteGrid && grid && floor) {
      grid.position.set(0, 0, 0);
      floor.position.set(0, 0, 0);
    } else {
      updateInfiniteGrid();
    }
  });

  document.getElementById('btn-toggle-menu').addEventListener('click', () => {
    const menu = document.getElementById('action-menu');
    const isCollapsed = menu.classList.toggle('collapsed');
    document.getElementById('btn-toggle-menu').innerText = isCollapsed ? '⚙️' : '❌';
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
  const levelOverlay = document.getElementById('level-overlay');

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
    const level = levels[index];
    document.getElementById('level-title').innerText = level.title;
    document.getElementById('level-instructions').innerText = level.instructions;
    levelOverlay.style.display = 'block';
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
        selectedObject.rotation.x = Math.PI / 2 - v;
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
        ghostObject.rotation.x = Math.PI / 2 - v;
      } else if (selectedItemType === 'mirror') {
        ghostObject.rotation.y = h;
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
    material = new THREE.MeshStandardMaterial({ color: 0x222222, transparent: true, opacity: 0.5 });
    ghostObject = new THREE.Mesh(geometry, material);
    ghostObject.rotation.x = Math.PI / 2;
    document.getElementById('rotation-container').style.display = 'block';
    document.getElementById('rotation-label-h').innerText = 'Horizontal Angle';
    document.getElementById('rotation-label-v').style.display = 'block';
    document.getElementById('rotation-slider-v').style.display = 'block';
  } else if (selectedItemType === 'mirror') {
    geometry = new THREE.BoxGeometry(0.2, 0.2, 0.02);
    material = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.5 });
    ghostObject = new THREE.Mesh(geometry, material);
    document.getElementById('rotation-container').style.display = 'block';
    document.getElementById('rotation-label-h').innerText = 'Horizontal Angle';
    document.getElementById('rotation-label-v').style.display = 'block';
    document.getElementById('rotation-slider-v').style.display = 'block';
  } else if (selectedItemType === 'prism' || selectedItemType === 'absorber') {
    if (selectedItemType === 'prism') {
      geometry = new THREE.TetrahedronGeometry(0.12);
      material = new THREE.MeshStandardMaterial({ color: 0xccffff, transparent: true, opacity: 0.5 });
    } else {
      geometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
      material = new THREE.MeshStandardMaterial({ color: 0x222222, transparent: true, opacity: 0.5 });
    }
    ghostObject = new THREE.Mesh(geometry, material);
    document.getElementById('rotation-container').style.display = 'none';
  }
  if (ghostObject) {
    ghostObject.visible = false;
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
    mesh.rotation.x = Math.PI / 2 - currentRotationV;
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
      geometry = new THREE.TetrahedronGeometry(0.12);
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
  const emitters = objects.filter(o => o.userData.type === 'laser').map(o => ({
    pos: o.position.clone(),
    quat: o.quaternion.clone()
  }));
  if (selectedItemType === 'laser' && ghostObject && ghostObject.visible) {
    emitters.push({ pos: ghostObject.position.clone(), quat: ghostObject.quaternion.clone() });
  }
  if (emitters.length === 0) {
    laserBeams.forEach(b => b.visible = false);
    return;
  }
  allPaths = [];
  const rayQueue = [];
  emitters.forEach(e => {
    const initialDir = new THREE.Vector3(0, 0, -1).applyQuaternion(e.quat).normalize();
    const emitterTip = e.pos.clone().add(initialDir.clone().multiplyScalar(0.05));
    rayQueue.push({ pos: emitterTip, dir: initialDir, depth: 0, color: 0xffffff });
  });
  const maxDepth = 24;
  const raycaster = new THREE.Raycaster();
  targetObjects.forEach(t => t.userData.active = false);
  while (rayQueue.length > 0 && allPaths.length < 128) {
    const { pos, dir, depth, color } = rayQueue.shift();
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
          hit.object.userData.active = true;
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
          rayQueue.push({ pos: hit.point.clone().add(currentDir.clone().multiplyScalar(0.001)), dir: currentDir.clone(), depth: depth + 1, color: color });
          branchFinished = true;
        } else if (hit.object.userData && hit.object.userData.type === 'prism') {
          [{ angle: -0.15, color: (color === 0xffffff) ? 0xff0000 : color }, { angle: 0, color: (color === 0xffffff) ? 0x00ff00 : color }, { angle: 0.15, color: (color === 0xffffff) ? 0x0000ff : color }].forEach(split => {
            const splitDir = currentDir.clone();
            const axis = new THREE.Vector3(0, 1, 0).cross(splitDir).normalize();
            if (axis.length() < 0.1) axis.set(1, 0, 0);
            splitDir.applyAxisAngle(axis, split.angle);
            rayQueue.push({ pos: hit.point.clone().add(splitDir.clone().multiplyScalar(0.01)), dir: splitDir, depth: depth + 1, color: split.color });
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
  if (currentMode === 'challenges' && targetObjects.length > 0 && !isLevelCompleting) {
    if (targetObjects.every(t => t.userData.active)) {
      isLevelCompleting = true;
      setTimeout(() => {
        if (currentLevelIndex < levels.length - 1) {
          alert('Challenge Complete! Loading next level...');
          unlockedLevelIndex = Math.max(unlockedLevelIndex, currentLevelIndex + 1);
          localStorage.setItem('unlockedLevelIndex', unlockedLevelIndex);
          window.loadLevel(currentLevelIndex + 1);
        } else {
          alert('Congratulations! You have completed all challenges!');
          isLevelCompleting = false;
        }
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
    if (intersects.length > 0) { reticle.visible = true; reticle.position.copy(intersects[0].point); }
    else { reticle.visible = false; }
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
          if (obj.userData.isFixed) { alert("This object is fixed and cannot be removed!"); return; }
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
          document.getElementById('rotation-container').style.display = 'block';
          document.getElementById('rotation-slider-h').value = (obj.userData.rotationH || 0) * (180 / Math.PI);
          document.getElementById('rotation-slider-v').value = (obj.userData.rotationV || 0) * (180 / Math.PI);
          return;
        }
      }
      const floorIntersects = raycaster.intersectObject(floor);
      if (selectedItemType && floorIntersects.length > 0) { placeObject(selectedItemType, null, floorIntersects[0].point.toArray()); }
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
