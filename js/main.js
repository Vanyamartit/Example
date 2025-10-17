/* global THREE */


// Ensure COLORS is defined at the very top

const COLORS = {
  grass_top: null,
  grass_side: null,
  // We can reuse the dirt material for the bottom
  dirt: null, // Placeholder for dirt material

  stone: null // Placeholder for stone material

};

const CUBE_FACES = [
  { // right
    uv: [0, 1, 1, 1, 0, 0, 1, 0],
    corners: [{ pos: [1, 1, 1], norm: [1, 0, 0] }, { pos: [1, 1, 0], norm: [1, 0, 0] }, { pos: [1, 0, 1], norm: [1, 0, 0] }, { pos: [1, 0, 0], norm: [1, 0, 0] }],
    dir: [1, 0, 0],
  },
  { // left
    uv: [0, 1, 1, 1, 0, 0, 1, 0],
    corners: [{ pos: [0, 1, 0], norm: [-1, 0, 0] }, { pos: [0, 1, 1], norm: [-1, 0, 0] }, { pos: [0, 0, 0], norm: [-1, 0, 0] }, { pos: [0, 0, 1], norm: [-1, 0, 0] }],
    dir: [-1, 0, 0],
  },
  { // top
    uv: [0, 1, 1, 1, 0, 0, 1, 0], // Standard UV for top face
    corners: [{ pos: [0, 1, 1], norm: [0, 1, 0] }, { pos: [1, 1, 1], norm: [0, 1, 0] }, { pos: [0, 1, 0], norm: [0, 1, 0] }, { pos: [1, 1, 0], norm: [0, 1, 0] }],
    dir: [0, 1, 0],
  },
  { // bottom
    uv: [0, 0, 1, 0, 0, 1, 1, 1], // Standard UV for bottom face
    corners: [{ pos: [0, 0, 0], norm: [0, -1, 0] }, { pos: [1, 0, 0], norm: [0, -1, 0] }, { pos: [0, 0, 1], norm: [0, -1, 0] }, { pos: [1, 0, 1], norm: [0, -1, 0] }],
    dir: [0, -1, 0],
  },
  { // front
    uv: [0, 1, 1, 1, 0, 0, 1, 0],
    corners: [{ pos: [1, 1, 1], norm: [0, 0, 1] }, { pos: [0, 1, 1], norm: [0, 0, 1] }, { pos: [1, 0, 1], norm: [0, 0, 1] }, { pos: [0, 0, 1], norm: [0, 0, 1] }],
    dir: [0, 0, 1],
  },
  { // back
    uv: [0, 1, 1, 1, 0, 0, 1, 0],
    corners: [{ pos: [0, 1, 0], norm: [0, 0, -1] }, { pos: [1, 1, 0], norm: [0, 0, -1] }, { pos: [0, 0, 0], norm: [0, 0, -1] }, { pos: [1, 0, 0], norm: [0, 0, -1] }],
    dir: [0, 0, -1],
  },
];



// Simple script loader with multi-source fallback

function ensureScript(urls, testFn) {

  const list = Array.isArray(urls) ? urls : [urls];

  let lastError;

  return list.reduce((chain, url) => {
    return chain.catch(() => new Promise((resolve, reject) => {

      if (testFn()) return resolve();

      const s = document.createElement('script');

      s.src = url;

      s.async = true;

      s.onload = () => (testFn() ? resolve() : reject(new Error('Failed to load: ' + url)));

      s.onerror = () => {

        lastError = new Error('Network error: ' + url);

        reject(lastError);

      };

      document.head.appendChild(s);

    }));

  }, Promise.reject()).catch(() => Promise.reject(lastError || new Error('All sources failed')));

}



// --- Inlined simplex-noise.js library ---
/*
 * A fast javascript implementation of simplex noise by Jonas Wagner.
 *
 * Based on a speed-improved simplex noise algorithm for 2D, 3D and 4D in Java.
 * Which is based on example code by Stefan Gustavson (stegu@itn.liu.se).
 * With Optimisations by Peter Eastman (peastman@drizzle.stanford.edu).
 * Better rank ordering method by Stefan Gustavson in 2012.
 *
 *
 * Copyright (C) 2016 Jonas Wagner
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */
const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
const F3 = 1.0 / 3.0;
const G3 = 1.0 / 6.0;

class SimplexNoise {
  constructor(random) {
    if (!random) random = Math.random;
    this.p = new Uint8Array(256);
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (var i = 0; i < 256; i++) {
      this.p[i] = random() * 256;
    }
    for (i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
    this.grad3 = new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1]);
  }

  noise2D(xin, yin) {
    var permMod12 = this.permMod12;
    var perm = this.perm;
    var grad3 = this.grad3;
    var n0 = 0, n1 = 0, n2 = 0;
    var s = (xin + yin) * F2;
    var i = Math.floor(xin + s);
    var j = Math.floor(yin + s);
    var t = (i + j) * G2;
    var X0 = i - t;
    var Y0 = j - t;
    var x0 = xin - X0;
    var y0 = yin - Y0;
    var i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    var x1 = x0 - i1 + G2;
    var y1 = y0 - j1 + G2;
    var x2 = x0 - 1.0 + 2.0 * G2;
    var y2 = y0 - 1.0 + 2.0 * G2;
    var ii = i & 255;
    var jj = j & 255;
    var t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      var gi0 = permMod12[ii + perm[jj]] * 3;
      t0 *= t0;
      n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0);
    }
    var t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      var gi1 = permMod12[ii + i1 + perm[jj + j1]] * 3;
      t1 *= t1;
      n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1);
    }
    var t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      var gi2 = permMod12[ii + 1 + perm[jj + 1]] * 3;
      t2 *= t2;
      n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2);
    }
    return 70.0 * (n0 + n1 + n2);
  }

  noise3D(xin, yin, zin) {
    var permMod12 = this.permMod12;
    var perm = this.perm;
    var grad3 = this.grad3;
    var n0, n1, n2, n3;
    var s = (xin + yin + zin) * F3;
    var i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
    var t = (i + j + k) * G3;
    var X0 = i - t, Y0 = j - t, Z0 = k - t;
    var x0 = xin - X0, y0 = yin - Y0, z0 = zin - Z0;
    var i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) { if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; } else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; } } else { if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; } else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; } else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } }
    var x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    var x2 = x0 - i2 + 2.0 * G3, y2 = y0 - j2 + 2.0 * G3, z2 = z0 - k2 + 2.0 * G3;
    var x3 = x0 - 1.0 + 3.0 * G3, y3 = y0 - 1.0 + 3.0 * G3, z3 = z0 - 1.0 + 3.0 * G3;
    var ii = i & 255, jj = j & 255, kk = k & 255;
    var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0; if (t0 < 0) n0 = 0.0; else { var gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3; t0 *= t0; n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0 + grad3[gi0 + 2] * z0); }
    var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1; if (t1 < 0) n1 = 0.0; else { var gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3; t1 *= t1; n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1 + grad3[gi1 + 2] * z1); }
    var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2; if (t2 < 0) n2 = 0.0; else { var gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3; t2 *= t2; n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2 + grad3[gi2 + 2] * z2); }
    var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3; if (t3 < 0) n3 = 0.0; else { var gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3; t3 *= t3; n3 = t3 * t3 * (grad3[gi3] * x1 + grad3[gi3 + 1] * y1 + grad3[gi3 + 2] * z1); }
    return 32.0 * (n0 + n1 + n2 + n3);
  }
}
// --- End of inlined library ---
async function boot() {
  const textureLoader = new THREE.TextureLoader();
  
  // Promisify texture loading
  const loadTexture = (url) => {
    return new Promise((resolve, reject) => {
      textureLoader.load(url, resolve, undefined, reject);
    });
  };

  // Wait for all textures to load before proceeding
  const [dirtTexture, stoneTexture, grassTopTexture, grassSideTexture] = await Promise.all([
    loadTexture('assets/textures/Dirt.png').catch(e => console.error("Failed to load dirt texture", e)),
    loadTexture('assets/textures/stone.png').catch(e => console.error("Failed to load stone texture", e)),
    loadTexture('assets/textures/Grass_block_on_top.png').catch(e => console.error("Failed to load grass_top texture", e)),
    loadTexture('assets/textures/Grass_block.png').catch(e => console.error("Failed to load grass_side texture", e)),
  ]);

  COLORS.dirt = new THREE.MeshStandardMaterial({ map: dirtTexture, roughness: 0.9 });
  COLORS.stone = new THREE.MeshStandardMaterial({ map: stoneTexture, roughness: 0.9 });
  COLORS.grass_top = new THREE.MeshStandardMaterial({ map: grassTopTexture, roughness: 0.9 });
  COLORS.grass_side = new THREE.MeshStandardMaterial({ map: grassSideTexture, roughness: 0.9 });

  // Ensure THREE exists (use only local file)
  if (!window.THREE) {
    console.error('Failed to load THREE.js. Ensure the file exists at ./vendor/three.min.js');
    console.error('Failed to load THREE.js. Ensure the file exists at ./vendor/three.min.js');
    return;
  }

  const app = document.getElementById('app');

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  const canvas = renderer.domElement;
  app.appendChild(renderer.domElement);

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0e10);

  // Camera
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  let mode = 'player';

  // --- Collision helpers ---
  const playerHeight = 1.8;
  const halfWidth = 0.3;
  const halfDepth = 0.3;

  // PLAYER state
  const player = new THREE.Object3D();
  scene.add(player);

  const playerCube = new THREE.Mesh(
    new THREE.BoxGeometry(halfWidth * 2, playerHeight, halfDepth * 2),
    new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 })
  );
  playerCube.castShadow = true;
  playerCube.position.y = playerHeight / 2;
  player.add(playerCube);
  playerCube.visible = false; // Make player cube invisible

  let pyaw = 0;
  let ppitch = 0;
  const pminPitch = -Math.PI / 2 + 0.01;
  const pmaxPitch = Math.PI / 2 - 0.01;
  const pVelocity = new THREE.Vector3();
  const pAccel = 2.85;
  const pDamp = 12;
  let pVelY = 0;
  const gravity = 25;
  const jumpSpeed = 8;
  const eyeHeight = 1.6; // Logical eye height for raycasting, relative to player feet
  let onGround = false;

  const keys = new Set();
  let lastWPress = 0;
  let isSprinting = false;
  const sprintSpeedMultiplier = 5.0 / pAccel;

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      if (onGround) {
        pVelY = jumpSpeed;
        onGround = false;
      }
      const now = performance.now();
      if (now - lastSpacePress < 300) { // Double-tap Space
        flightMode = !flightMode;
        pVelY = 0; // Reset vertical velocity
      }
      lastSpacePress = now;
    }
    keys.add(e.code);
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });

  canvas.addEventListener('click', () => {
    if (mode === 'player' && document.pointerLockElement !== canvas) {
      canvas.requestPointerLock({
        unadjustedMovement: true,
      }).catch((err) => console.error('Pointer lock failed:', err));
    }
  });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) mode = 'player';
    else {
      mode = 'menu'; // Switch to menu mode or handle appropriately
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (mode === 'player' && document.pointerLockElement === canvas) {
      const SENS = 0.0025;
      pyaw -= e.movementX * SENS;
      ppitch -= e.movementY * SENS;
      ppitch = Math.max(pminPitch, Math.min(pmaxPitch, ppitch));
    }
  });

  // Lights
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x303030, 0.8);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(5, 10, 7);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);

  // Ground grid
  const CHUNK_SIZE = 16;
  const chunks = new Map();

  class Chunk {
    constructor(x, y, z, size) {
      this.position = new THREE.Vector3(x, y, z);
      this.size = size;
      this.voxels = new Set();
      this.mesh = new THREE.Group();
      this.simpleMesh = null;
      this.detailed = false;
      this.boundingBox = new THREE.Box3(this.position, this.position.clone().addScalar(this.size));
    }

    addVoxel(x, y, z) {
      this.voxels.add(keyOf(x, y, z));
    }

    buildMeshes() {
      this.mesh.children.forEach(mesh => mesh.geometry.dispose()); // Dispose old detailed geometry
      this.mesh.clear();
  
      // Create a separate geometry for textured materials that includes UVs
      const texturedGeometry = new THREE.BoxGeometry(1, 1, 1);

      const voxelsByMaterial = new Map();
  
      // Group voxels by material
      this.voxels.forEach(k => {
        const material = voxelColors.get(k) || COLORS.stone;
        if (!voxelsByMaterial.has(material)) {
          voxelsByMaterial.set(material, []);
        }
        voxelsByMaterial.get(material).push(k);
      });
  
      voxelsByMaterial.forEach((voxelList, material) => {
        let meshMaterial;
        let meshGeometry = texturedGeometry; // Use geometry with UVs for all
  
        if (material === 'grass') {
          meshMaterial = COLORS.grass_side; // Use side material for the whole grass block
        } else if (material instanceof THREE.Material) {
          meshMaterial = material;
        } else {
          meshMaterial = new THREE.MeshStandardMaterial({ color: material, roughness: 0.9 });
        }
  
        const mesh = new THREE.InstancedMesh(meshGeometry, meshMaterial, voxelList.length);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        let i = 0;
        voxelList.forEach(k => {
          const [vx, vy, vz] = k.split(',').map(Number);
          dummy.position.set(centerFromVoxel(vx), centerFromVoxel(vy), centerFromVoxel(vz));
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          i++;
        });
        
        mesh.instanceMatrix.needsUpdate = true;

        this.mesh.add(mesh);
      });

      // Simple mesh (low detail)
      const simpleGeo = new THREE.BoxGeometry(this.size, this.size, this.size);
      const simpleMat = new THREE.MeshLambertMaterial({ color: 0x88cc88, wireframe: true, transparent: true, opacity: 0.3 });
      this.simpleMesh = new THREE.Mesh(simpleGeo, simpleMat);
      this.simpleMesh.position.set(this.position.x + this.size / 2, this.position.y + this.size / 2, this.position.z + this.size / 2);
    }
  }

  // Ensure voxels is defined
  const voxels = new Set();

  // Ensure voxelColors is defined
  const voxelColors = new Map();

  // Define keyOf function if not already defined
  const keyOf = (x, y, z) => `${x},${y},${z}`;

  // Noise functions will be initialized in boot()
  let noise2D, noise3D;
  noise2D = new SimplexNoise();
  noise3D = new SimplexNoise();

  const HEIGHT_SCALE = 10; // Adjust the height scale
  const TERRAIN_SCALE = 0.05;
  const CAVE_SCALE = 0.1;
  const CAVE_THRESHOLD = 0.6;

  function generateChunk(cx, cy, cz) {
    const chunkKey = keyOf(cx, cy, cz);
    if (chunks.has(chunkKey)) return chunks.get(chunkKey);

    const chunk = new Chunk(cx, cy, cz, CHUNK_SIZE);
    chunks.set(chunkKey, chunk);

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = cx + x;
        const worldZ = cz + z;
        const height = Math.floor((noise2D.noise2D(worldX * TERRAIN_SCALE, worldZ * TERRAIN_SCALE) + 1) * 0.5 * HEIGHT_SCALE);

        for (let y = 0; y < CHUNK_SIZE; y++) {
          const worldY = cy + y;
          if (worldY <= height) {
            // Cave generation
            const caveNoise = (noise3D.noise3D(worldX * CAVE_SCALE, worldY * CAVE_SCALE, worldZ * CAVE_SCALE) + 1) * 0.5;
            if (worldY < height -1 && caveNoise > CAVE_THRESHOLD) { // Keep top layer solid
              continue; // Carve out a cave
            }

            const key = keyOf(worldX, worldY, worldZ);
            voxels.add(key);
            const color = worldY === height ? 'grass' : worldY > height - 3 ? COLORS.dirt : COLORS.stone;
            voxelColors.set(key, color);
            chunk.addVoxel(worldX, worldY, worldZ);
          }
        }
      }
    }
    chunk.buildMeshes();
    return chunk;
  }

  scene.add(hemi);
  scene.add(dir);

  // --- Day/Night Cycle ---
  let timeOfDay = 0.25; // Start at sunrise
  const dayDuration = 60 * 5; // 5 minutes for a full day-night cycle
  const sunPathRadius = 100;

  const dayColor = new THREE.Color(0x87CEEB);
  const nightColor = new THREE.Color(0x0e0e10);
  const sunsetColor = new THREE.Color(0xFF7F50);

  function updateDayNightCycle(time) {
    // time is from 0 (midnight) to 1 (next midnight)
    const sunAngle = (time - 0.25) * Math.PI * 2; // 0 at sunrise

    // Sun position
    dir.position.set(
      Math.cos(sunAngle) * sunPathRadius,
      Math.sin(sunAngle) * sunPathRadius,
      20 // Keep it slightly offset to get interesting shadow angles
    );

    // Light intensity
    const sunUp = dir.position.y > 0;
    dir.intensity = sunUp ? Math.max(0, Math.sin(sunAngle)) * 0.9 : 0;
    dir.castShadow = sunUp;
    hemi.intensity = Math.max(0.2, Math.sin(sunAngle)) * 0.8;

    // Sky color
    let skyColor = new THREE.Color();
    if (time > 0.22 && time < 0.28) { // Sunrise
      skyColor.lerpColors(nightColor, sunsetColor, (time - 0.22) / 0.06);
    } else if (time >= 0.28 && time < 0.72) { // Day
      skyColor.lerpColors(sunsetColor, dayColor, (time - 0.28) / 0.44);
    } else if (time >= 0.72 && time < 0.78) { // Sunset
      skyColor.lerpColors(dayColor, sunsetColor, (time - 0.72) / 0.06);
    } else { // Night
      skyColor.lerpColors(sunsetColor, nightColor, (time > 0.78 ? time - 0.78 : time + 0.22) / 0.44);
    }

    scene.background.copy(skyColor);
    if (scene.fog) {
      scene.fog.color.copy(skyColor);
    }
  }

  camera.position.set(0, 10, 20);
  camera.lookAt(0, 0, 0);

  const outlineGeom = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.001, 1.001, 1.001));
  const outlineMat = new THREE.LineBasicMaterial({ color: 0xffff66 });
  const outline = new THREE.LineSegments(outlineGeom, outlineMat);
  outline.visible = false;
  scene.add(outline);

  const WORLD = { minY: -5, maxY: HEIGHT_SCALE + 5 };

  // Adjust collision handling to prevent getting stuck
  function clampToWorld() {
    player.position.y = Math.max(WORLD.minY, Math.min(WORLD.maxY, player.position.y));

    // Ensure player doesn't get stuck in the ground
    if (player.position.y <= WORLD.minY) {
      player.position.y = WORLD.minY;
      pVelY = 0; // Reset vertical velocity
      onGround = true;
    }
  }

  // This is no longer needed as geometry is created dynamically in buildMeshes

  // Add a safeguard to prevent infinite loops or excessive operations
  const MAX_ITERATIONS = 10000; // Limit the number of iterations in loops

  function voxelRaycast(origin, dir, maxDist = 8) {
    const d = dir.clone().normalize();
    const startOffset = 0.1;
    const sx = origin.x + d.x * startOffset, sy = origin.y + d.y * startOffset, sz = origin.z + d.z * startOffset;
    let ix = Math.floor(sx + 0.5), iy = Math.floor(sy + 0.5), iz = Math.floor(sz + 0.5);
    const stepX = d.x > 0 ? 1 : -1, stepY = d.y > 0 ? 1 : -1, stepZ = d.z > 0 ? 1 : -1;
    const invDx = 1 / Math.abs(d.x), invDy = 1 / Math.abs(d.y), invDz = 1 / Math.abs(d.z);
    let tMaxX = (ix + (d.x > 0 ? 0.5 : -0.5) - sx) / d.x;
    let tMaxY = (iy + (d.y > 0 ? 0.5 : -0.5) - sy) / d.y;
    let tMaxZ = (iz + (d.z > 0 ? 0.5 : -0.5) - sz) / d.z;
    let t = 0, lastStep;
    let iterations = 0; // Counter for iterations

    while (t <= maxDist) {  
      if (iterations++ > MAX_ITERATIONS) {
        console.error('voxelRaycast exceeded maximum iterations');
        return null;
      }

      const k = keyOf(ix, iy, iz);
      if (voxels.has(k)) {
        const normal = new THREE.Vector3(0, 0, 0);
        if (lastStep === 'x') normal.set(-stepX, 0, 0);
        if (lastStep === 'y') normal.set(0, -stepY, 0);
        if (lastStep === 'z') normal.set(0, 0, -stepZ);
        return { voxel: { x: ix, y: iy, z: iz }, normal, dist: t };
      }
      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) { t = tMaxX; ix += stepX; tMaxX += invDx; lastStep = 'x'; }
        else { t = tMaxZ; iz += stepZ; tMaxZ += invDz; lastStep = 'z'; }
      } else {
        if (tMaxY < tMaxZ) { t = tMaxY; iy += stepY; tMaxY += invDy; lastStep = 'y'; }
        else { t = tMaxZ; iz += stepZ; tMaxZ += invDz; lastStep = 'z'; }
      }
    }
    return null;
  }

  document.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mousedown', (e) => {
    if (mode !== 'player' || document.pointerLockElement !== canvas) return;
    const rayOrigin = player.position.clone().add(new THREE.Vector3(0, eyeHeight, 0));
    const rayDirection = new THREE.Vector3();
    camera.getWorldDirection(rayDirection);
    const res = voxelRaycast(rayOrigin, rayDirection, 6);
    if (!res) return;

    const getChunkForVoxel = (vx, vy, vz) => {
        const cx = Math.floor(vx / CHUNK_SIZE) * CHUNK_SIZE;
        const cy = Math.floor(vy / CHUNK_SIZE) * CHUNK_SIZE;
        const cz = Math.floor(vz / CHUNK_SIZE) * CHUNK_SIZE;
        const chunkKey = keyOf(cx, cy, cz);
        return chunks.get(chunkKey);
    };

    const rebuildChunk = (chunk) => {
        if (chunk) {
            if (chunk.mesh) scene.remove(chunk.mesh);
            if (chunk.simpleMesh) scene.remove(chunk.simpleMesh);
            chunk.buildMeshes(); // Rebuild with correct culling
            // Add the correct mesh back to the scene based on its current detail state
            if (chunk.detailed) {
                scene.add(chunk.mesh);
            } else {
                scene.add(chunk.simpleMesh);
            }
        }
    };

    if (e.button === 0) { // Destroy block
      const kDel = keyOf(res.voxel.x, res.voxel.y, res.voxel.z);
      if (voxels.delete(kDel)) {
        voxelColors.delete(kDel);
        const chunk = getChunkForVoxel(res.voxel.x, res.voxel.y, res.voxel.z);
        if (chunk) {
            chunk.voxels.delete(kDel);
            rebuildChunk(chunk);
        }
      }
    } else if (e.button === 2) { // Place block
      const nx = res.voxel.x + res.normal.x, ny = res.voxel.y + res.normal.y, nz = res.voxel.z + res.normal.z;
      const k = keyOf(nx, ny, nz);
      const aabb = playerAABB();
      const vminX = nx - 0.5, vmaxX = nx + 0.5, vminY = ny - 0.5, vmaxY = ny + 0.5, vminZ = nz - 0.5, vmaxZ = nz + 0.5;
      const overlap = (minA, maxA, minB, maxB) => (maxA > minB) && (minA < maxB);
      if (!voxels.has(k) && !(overlap(aabb.minX, aabb.maxX, vminX, vmaxX) && overlap(aabb.minY, aabb.maxY, vminY, vmaxY) && overlap(aabb.minZ, aabb.maxZ, vminZ, vmaxZ))) {
        voxels.add(k);
        voxelColors.set(k, COLORS.stone);
        let chunk = getChunkForVoxel(nx, ny, nz);
        if (!chunk) {
            const cx = Math.floor(nx / CHUNK_SIZE) * CHUNK_SIZE;
            const cy = Math.floor(ny / CHUNK_SIZE) * CHUNK_SIZE;
            const cz = Math.floor(nz / CHUNK_SIZE) * CHUNK_SIZE;
            const chunkKey = keyOf(cx, cy, cz);
            chunk = new Chunk(cx, cy, cz, CHUNK_SIZE);
            chunks.set(chunkKey, chunk);
        }
        chunk.addVoxel(nx, ny, nz);
        rebuildChunk(chunk);
      }
    }
  });

  (function placeSpawnOnTop() {
    const sx = 0, sz = 0;
    let maxVy = -Infinity;
    voxels.forEach((k) => {
      const [vx, vy, vz] = k.split(',').map(Number);
      if (vx === sx && vz === sz) maxVy = Math.max(maxVy, vy);
    });
    if (isFinite(maxVy)) {
      player.position.set(sx, maxVy + 0.5, sz);
      pVelY = 0;
      onGround = true;
    }
  })();

  function playerAABB() {
    const p = player.position; // Player position is at the feet
    return { minX: p.x - halfWidth, maxX: p.x + halfWidth, minY: p.y, maxY: p.y + playerHeight, minZ: p.z - halfDepth, maxZ: p.z + halfDepth };
  }

  function vIdx(v) { return Math.floor(v); }
  function getSpan(min, max) {
    const a = vIdx(min), b = vIdx(max - 1e-7);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }

  function moveAxis(axis, delta) {
    if (delta === 0) return;
    const a = playerAABB();
    const eps = 1e-6;
    if (axis === 'y') {
      const isDown = delta < 0;
      const spanX = getSpan(a.minX, a.maxX), spanZ = getSpan(a.minZ, a.maxZ);
      const targetY = isDown ? a.minY + delta : a.maxY + delta;
      // Add a small epsilon to the check to handle edge cases where player is exactly on a boundary
      const start = vIdx(isDown ? a.minY - eps : a.maxY + eps), end = vIdx(targetY);

      for (let iy = start; isDown ? iy >= end : iy <= end; isDown ? iy-- : iy++) {
          for (let ix = spanX.min; ix <= spanX.max; ix++) {
            for (let iz = spanZ.min; iz <= spanZ.max; iz++) {
              if (voxels.has(keyOf(ix, iy, iz))) {
              const surface = iy + (isDown ? 1 : 0);
              const penetration = isDown ? surface - a.minY : surface - a.maxY;
              player.position.y += penetration + (isDown ? eps : -eps);
              pVelY = 0;
              if (isDown) onGround = true;
              return;
              }
            }
          } // end for ix
        } // end for iy
    } else if (axis === 'x') { // The 'else' part of the 'if (axis === 'y')'
        const isNeg = delta < 0;
        const spanY = getSpan(a.minY, a.maxY);
        const spanZ = getSpan(a.minZ, a.maxZ);
        const targetX = isNeg ? a.minX + delta : a.maxX + delta;
        const start = vIdx(isNeg ? a.minX : a.maxX);
        const end = vIdx(targetX);

        for (let ix = start; isNeg ? ix >= end : ix <= end; isNeg ? ix-- : ix++) {
            for (let iy = spanY.min; iy <= spanY.max; iy++) {
                for (let iz = spanZ.min; iz <= spanZ.max; iz++) {
                    if (voxels.has(keyOf(ix, iy, iz))) { // If there's a voxel in the way
                        const surface = ix + (isNeg ? 1 : 0);
                        const penetration = surface - (isNeg ? a.minX : a.maxX);
                        player.position.x += penetration + (isNeg ? eps : -eps);
                        pVelocity.x = 0;
                        return;
                    }
                }
            }
        }
    } else if (axis === 'z') {
        const isNeg = delta < 0;
        const spanX = getSpan(a.minX, a.maxX);
        const spanY = getSpan(a.minY, a.maxY);
        const targetZ = isNeg ? a.minZ + delta : a.maxZ + delta;
        const start = vIdx(isNeg ? a.minZ : a.maxZ);
        const end = vIdx(targetZ);

        for (let iz = start; isNeg ? iz >= end : iz <= end; isNeg ? iz-- : iz++) {
            for (let ix = spanX.min; ix <= spanX.max; ix++) {
                for (let iy = spanY.min; iy <= spanY.max; iy++) {
                    if (voxels.has(keyOf(ix, iy, iz))) { // If there's a voxel in the way
                        const surface = iz + (isNeg ? 1 : 0);
                        const penetration = surface - (isNeg ? a.minZ : a.maxZ);
                        player.position.z += penetration + (isNeg ? eps : -eps);
                        pVelocity.z = 0;
                        return;
                    }
                }
            }
        }
    }
    if (axis === 'y') player.position.y += delta;
    else if (axis === 'x') player.position.x += delta;
    else if (axis === 'z') player.position.z += delta;
  }

  // Add flight mode and FPS counter
  let flightMode = false;
  let lastSpacePress = 0;
  const fpsCounter = document.createElement('div');
  fpsCounter.style.position = 'absolute';
  fpsCounter.style.top = '10px';
  fpsCounter.style.left = '10px';
  fpsCounter.style.color = 'white';
  fpsCounter.style.fontFamily = 'monospace';
  fpsCounter.style.fontSize = '14px';
  fpsCounter.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  fpsCounter.style.padding = '5px';
  fpsCounter.style.borderRadius = '5px';
  document.body.appendChild(fpsCounter);

  function updateFPSCounter() {
    const now = performance.now();
    const fps = (1000 / (now - (updateFPSCounter.last || now))).toFixed(1);
    updateFPSCounter.last = now;
    fpsCounter.textContent = `FPS: ${fps}`;
  }

  // Add a frame rate limiter to prevent excessive calls to tick
  const FRAME_LIMIT = 60; // Limit to 60 FPS
  const FRAME_DURATION = 1000 / FRAME_LIMIT;
  let lastFrameTime = 0;

  // Add terminal velocity to prevent excessive falling speed
  const TERMINAL_VELOCITY = -50; // Maximum falling speed

  // LOD Logic
  const nearDistance = 40; // The distance at which chunks become detailed
  const farDistance = 80;  // The distance at which chunks become simple
  const chunkViewDistance = Math.ceil(farDistance / CHUNK_SIZE);
  const activeChunks = new Set();

  // Frustum for culling
  const frustum = new THREE.Frustum();

  function updateChunks(playerPosition) {
    const px = Math.floor(playerPosition.x / CHUNK_SIZE);
    const py = Math.floor(playerPosition.y / CHUNK_SIZE);
    const pz = Math.floor(playerPosition.z / CHUNK_SIZE);
    const newActiveChunks = new Set();

    const verticalChunkViewDistance = 2; // How many chunks to load up/down

    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));


    for (let x = px - chunkViewDistance; x <= px + chunkViewDistance; x++) {
      for (let y = py - verticalChunkViewDistance; y <= py + verticalChunkViewDistance; y++) {
        for (let z = pz - chunkViewDistance; z <= pz + chunkViewDistance; z++) {
          const key = keyOf(x * CHUNK_SIZE, y * CHUNK_SIZE, z * CHUNK_SIZE);
          newActiveChunks.add(key);

          let chunk = chunks.get(key);
          if (!chunk) {
              chunk = generateChunk(x * CHUNK_SIZE, y * CHUNK_SIZE, z * CHUNK_SIZE);
          }

          if (!chunk) continue;

          const chunkCenter = chunk.position.clone().add(new THREE.Vector3(chunk.size / 2, chunk.size / 2, chunk.size / 2));
          const distance = playerPosition.distanceTo(chunkCenter);
          const isInFrustum = frustum.intersectsBox(chunk.boundingBox);
 
          if (distance < nearDistance && isInFrustum) {
            // Show detailed mesh
            if (!chunk.detailed) {
              scene.remove(chunk.simpleMesh);
              scene.add(chunk.mesh);
              chunk.detailed = true;
            }
          } else if (distance < farDistance) {
            // Show simple mesh
            if (chunk.detailed) {
              scene.remove(chunk.mesh);
              chunk.detailed = false;
            }
            if (!chunk.simpleMesh.parent) scene.add(chunk.simpleMesh);
          } else {
            // Hide both
            if (chunk.mesh.parent) scene.remove(chunk.mesh);
            if (chunk.simpleMesh.parent) scene.remove(chunk.simpleMesh);
            chunk.detailed = false;
          }
        }
      }
    }

    activeChunks.forEach(key => {
        if (!newActiveChunks.has(key)) {
            const chunk = chunks.get(key);
            if (chunk) {
                scene.remove(chunk.simpleMesh);
                scene.remove(chunk.mesh);
                chunk.detailed = false;
            }
        }
    });

    activeChunks.clear();
    newActiveChunks.forEach(key => activeChunks.add(key));
  }

  function tick(now) {
    now = now || performance.now();
    if (!tick.last) tick.last = now;

    // Update chunks periodically
    updateChunks(player.position);

    const dt = now - lastFrameTime;

    if (dt < FRAME_DURATION) {
      requestAnimationFrame(tick);
      return;
    }

    lastFrameTime = now;

    const deltaTime = Math.min(0.033, (now - tick.last) / 1000);
    tick.last = now;

    // Update day/night cycle
    timeOfDay += deltaTime / dayDuration;
    if (timeOfDay >= 1) timeOfDay -= 1;
    updateDayNightCycle(timeOfDay);
    
    const isSneaking = keys.has('ShiftLeft') || keys.has('ShiftRight');

    if (mode === 'player') {
      const isSprinting = keys.has('ControlLeft') && keys.has('KeyW') && !isSneaking;
      const sprintSpeedMultiplier = 5.0 / pAccel;

      let currentAccel = isSneaking ? pAccel * 0.4 : pAccel;

      if (isSprinting) currentAccel *= sprintSpeedMultiplier;
      
      const forward = new THREE.Vector3(-Math.sin(pyaw), 0, -Math.cos(pyaw));
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
      let wish = new THREE.Vector3();

      if (keys.has('KeyW')) wish.add(forward);
      if (keys.has('KeyS')) wish.sub(forward);
      if (keys.has('KeyA')) wish.sub(right);
      if (keys.has('KeyD')) wish.add(right);

      wish.normalize();

      const wishVel = new THREE.Vector3(wish.x, 0, wish.z).multiplyScalar(currentAccel);

      if (flightMode) {
        pVelocity.lerp(wishVel, pDamp * deltaTime);
        pVelY = 0;
        if (keys.has('Space')) pVelY = currentAccel;
        if (keys.has('ControlLeft') || keys.has('ControlRight')) pVelY = -currentAccel;
        
        moveAxis('x', pVelocity.x * deltaTime);
        moveAxis('y', pVelY * deltaTime);
        moveAxis('z', pVelocity.z * deltaTime);
      } else {
        pVelocity.lerp(wishVel, pDamp * deltaTime);
        pVelY -= gravity * deltaTime;
        pVelY = Math.max(pVelY, TERMINAL_VELOCITY);

        moveAxis('x', pVelocity.x * deltaTime);
        moveAxis('y', pVelY * deltaTime);
        moveAxis('z', pVelocity.z * deltaTime);
      }

      clampToWorld();

      // Update camera to follow player
      playerCube.position.y = playerHeight / 2; // Обновляем позицию куба игрока в соответствии с новой высотой
      camera.position.copy(player.position);
      camera.position.y += eyeHeight;
      camera.rotation.order = 'YXZ';
      camera.rotation.y = pyaw;
      camera.rotation.x = ppitch;
    }

    const rayOrigin = player.position.clone().add(new THREE.Vector3(0, eyeHeight, 0));
    const rayDirection = new THREE.Vector3();
    camera.getWorldDirection(rayDirection);
    const hit = voxelRaycast(rayOrigin, rayDirection, 6);

    if (hit) { // The center of the outline should be the center of the voxel
      outline.position.set(hit.voxel.x, hit.voxel.y, hit.voxel.z);
      outline.visible = true;
    } else {
      outline.visible = false;
    }

    renderer.render(scene, camera);
    updateFPSCounter();
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Ensure the canvas is properly updated and visible
  canvas.style.display = 'block';
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';

  // Add a fallback to force canvas redraw
  function forceRedraw() {
    renderer.render(scene, camera);
  }

  // setInterval(forceRedraw, 1000); // Force redraw every second as a fallback
}

// Function to calculate the center position of a voxel
function centerFromVoxel(coord) { // A voxel at (x,y,z) is centered at (x,y,z)
  return coord;
}

// Ensure dummy is defined
const dummy = new THREE.Object3D();

boot().catch(err => console.error('Failed to initialize scene:', err));