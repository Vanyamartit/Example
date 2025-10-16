/* global THREE */



// Ensure COLORS is defined at the very top

const COLORS = {

  grass: new THREE.Color(0x5dac44),

  dirt: null, // Placeholder for dirt material

  stone: null // Placeholder for stone material

};



// Simple script loader with multi-source fallback

function ensureScript(urls, testFn) {

  const list = Array.isArray(urls) ? urls : [urls];

  let lastError;

  return list.reduce((chain, url) => {

    return chain.catch(() => new Promise((resolve, reject) => {c

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



async function boot() {

  // Load textures and define materials FIRST
  const textureLoader = new THREE.TextureLoader();
  const dirtTexture = textureLoader.load('./assets/textures/Dirt.png');
  const stoneTexture = textureLoader.load('./assets/textures/stone.png');

  const dirtMaterial = new THREE.MeshStandardMaterial({ map: dirtTexture, roughness: 0.9 });
  const stoneMaterial = new THREE.MeshStandardMaterial({ map: stoneTexture, roughness: 0.9 });

  COLORS.dirt = dirtMaterial;
  COLORS.stone = stoneMaterial;

  // Ensure THREE exists (use only local file)
  if (!window.THREE) {
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

  const pAccel = 80;

  const pDamp = 12;

  let pVelY = 0;

  const gravity = 25;

  const jumpSpeed = 8;

  const eyeHeight = 1.6; // Logical eye height for raycasting, relative to player feet

  let onGround = false;



  const keys = new Set();

  let lastWPress = 0;

  let isSprinting = false;

  const sprintSpeedMultiplier = 1.5;



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
    } else if (e.code === 'KeyW') {
      const now = performance.now();
      if (now - lastWPress < 300) { // 300ms for double tap
        isSprinting = true;
      }
      lastWPress = now;
    } else if (e.code !== 'ShiftLeft' && e.code !== 'ShiftRight') {
      isSprinting = false;
    }
    keys.add(e.code);
  });



  window.addEventListener('keyup', (e) => {

    if (e.code === 'KeyW') {

      isSprinting = false;

    }

    keys.delete(e.code);

  });



  const canvas = renderer.domElement;

  canvas.addEventListener('click', () => {

    if (mode === 'player' && document.pointerLockElement !== canvas) {

      canvas.requestPointerLock?.();

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
      this.detailedMesh = new THREE.Group(); // This will hold meshes for each material type
      this.simpleMesh = null;
      this.detailed = false;
    }

    addVoxel(x, y, z) {
      this.voxels.add(keyOf(x, y, z));
    }

    buildMeshes() {
      // Dispose old meshes and clear the group
      this.detailedMesh.children.forEach(mesh => {
        // The geometry is shared, so we don't dispose it here.
        // Materials are also shared.
      });
      this.detailedMesh.clear();

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
        if (voxelList.length === 0) return;

        let meshMaterial;
        if (material instanceof THREE.Material) {
          meshMaterial = material;
        } else {
          // It's a color (like grass), create a basic material for it
          meshMaterial = new THREE.MeshStandardMaterial({ color: material, roughness: 0.9 });
        }
        
        const mesh = new THREE.InstancedMesh(geometry, meshMaterial, voxelList.length);
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
        
        mesh.instanceMatrix.needsUpdate = true; // <-- THE FIX

        this.detailedMesh.add(mesh);
      });

      // Simple mesh (low detail)
      const simpleGeo = new THREE.BoxGeometry(this.size, this.size, this.size);
      const simpleMat = new THREE.MeshLambertMaterial({ color: 0x88cc88 });
      this.simpleMesh = new THREE.Mesh(simpleGeo, simpleMat);
      this.simpleMesh.position.set(this.position.x + this.size / 2, this.position.y + this.size / 2, this.position.z + this.size / 2);
    }
  }

  const grid = new THREE.GridHelper(24, 24, 0x444a, 0x2226);

  scene.add(grid);



  // Ensure voxels is defined

  const voxels = new Set();



  // Ensure voxelColors is defined

  const voxelColors = new Map();



  // Define keyOf function if not already defined

  const keyOf = (x, y, z) => `${x},${y},${z}`;



  // Improved Perlin noise using a library

  function perlin(x, y) {

    // Replace this with a proper Perlin noise library if available

    const n = Math.sin(x * 0.1) * Math.cos(y * 0.1);

    return n;

  }



  function generateTerrain(size, heightScale) {

    const terrain = new Set();

    const colors = new Map();



    for (let x = -size; x <= size; x++) {

      for (let z = -size; z <= size; z++) {

        const height = Math.floor((perlin(x, z) + 1) * 0.5 * heightScale);

        for (let y = 0; y <= height; y++) {

          const key = keyOf(x, y, z);

          terrain.add(key);

          colors.set(key, y === height ? COLORS.grass : y > height - 3 ? COLORS.dirt : COLORS.stone);

        }

      }

    }



    return { terrain, colors };

  }



  const SIZE = 20; // Adjust the size of the terrain

  const HEIGHT_SCALE = 10; // Adjust the height scale

  const { terrain, colors } = generateTerrain(SIZE, HEIGHT_SCALE);



  voxels.clear();

  voxelColors.clear();

  terrain.forEach((key) => {

    voxels.add(key);

    voxelColors.set(key, colors.get(key));

  });

  // Instead of a single global mesh, let's process voxels into chunks
  voxels.forEach(k => {
    const [vx, vy, vz] = k.split(',').map(Number);
    const cx = Math.floor(vx / CHUNK_SIZE) * CHUNK_SIZE;
    const cy = Math.floor(vy / CHUNK_SIZE) * CHUNK_SIZE;
    const cz = Math.floor(vz / CHUNK_SIZE) * CHUNK_SIZE;
    const chunkKey = keyOf(cx, cy, cz);

    if (!chunks.has(chunkKey)) {
      chunks.set(chunkKey, new Chunk(cx, cy, cz, CHUNK_SIZE));
    }
    chunks.get(chunkKey).addVoxel(vx, vy, vz);
  });

  // Build meshes for each chunk
  chunks.forEach(chunk => {
    chunk.buildMeshes();
  });

  scene.add(hemi);
  scene.add(dir);

  camera.position.set(0, 10, 20);

  camera.lookAt(0, 0, 0);



  const outlineGeom = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.001, 1.001, 1.001));

  const outlineMat = new THREE.LineBasicMaterial({ color: 0xffff66 });

  const outline = new THREE.LineSegments(outlineGeom, outlineMat);

  outline.visible = false;

  scene.add(outline);



  const WORLD = { minX: -SIZE, maxX: SIZE, minZ: -SIZE, maxZ: SIZE, minY: -5, maxY: SIZE +   5 };



  // Adjust collision handling to prevent getting stuck

  function clampToWorld() {

    player.position.x = Math.max(WORLD.minX + halfWidth, Math.min(WORLD.maxX - halfWidth, player.position.x));

    player.position.z = Math.max(WORLD.minZ + halfDepth, Math.min(WORLD.maxZ - halfDepth, player.position.z));

    player.position.y = Math.max(WORLD.minY, Math.min(WORLD.maxY, player.position.y));



    // Ensure player doesn't get stuck in the ground

    if (player.position.y <= WORLD.minY) {

      player.position.y = WORLD.minY;

      pVelY = 0; // Reset vertical velocity

      onGround = true;

    }

  }



  // Ensure geometry is defined

  var geometry = new THREE.BoxGeometry(1, 1, 1);







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
            if (chunk.detailedMesh) scene.remove(chunk.detailedMesh);
            if (chunk.simpleMesh) scene.remove(chunk.simpleMesh);
            chunk.buildMeshes();
            // The periodic update will add the correct mesh back to the scene
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

    const p = player.position;

    return { minX: p.x - halfWidth, maxX: p.x + halfWidth, minY: p.y, maxY: p.y + playerHeight, minZ: p.z - halfDepth, maxZ: p.z + halfDepth };

  }



  function vIdx(v) { return Math.floor(v + 0.5); }

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

      const start = vIdx(isDown ? a.minY : a.maxY), end = vIdx(targetY);

      for (let iy = start; isDown ? iy >= end : iy <= end; isDown ? iy-- : iy++) {

        for (let ix = spanX.min; ix <= spanX.max; ix++) {

          for (let iz = spanZ.min; iz <= spanZ.max; iz++) {

            if (voxels.has(keyOf(ix, iy, iz))) {

              const surface = iy + (isDown ? 0.5 : -0.5);

              const penetration = isDown ? surface - a.minY : surface - a.maxY;

              player.position.y += penetration + (isDown ? eps : -eps);

              pVelY = 0;

              if (isDown) onGround = true;

              return;

            }

          }

        }

      }

    } else if (axis === 'x') {

        const isNeg = delta < 0;

        const spanY = getSpan(a.minY, a.maxY);

        const spanZ = getSpan(a.minZ, a.maxZ);

        const targetX = isNeg ? a.minX + delta : a.maxX + delta;

        const start = vIdx(isNeg ? a.minX : a.maxX);

        const end = vIdx(targetX);



        for (let ix = start; isNeg ? ix >= end : ix <= end; isNeg ? ix-- : ix++) {

            for (let iy = spanY.min; iy <= spanY.max; iy++) {

                for (let iz = spanZ.min; iz <= spanZ.max; iz++) {

                    if (voxels.has(keyOf(ix, iy, iz))) {

                        const surface = ix + (isNeg ? 0.5 : -0.5);

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

                    if (voxels.has(keyOf(ix, iy, iz))) {

                        const surface = iz + (isNeg ? 0.5 : -0.5);

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



  // Ensure gravity and velocity are applied correctly

  // Add debug logs to identify where the freeze occurs

  // Add a frame rate limiter to prevent excessive calls to tick

  const FRAME_LIMIT = 60; // Limit to 60 FPS

  const FRAME_DURATION = 1000 / FRAME_LIMIT;

  let lastFrameTime = 0;






  // Add detailed debug logs to track player state and collisions



  // Add terminal velocity to prevent excessive falling speed

  const TERMINAL_VELOCITY = -50; // Maximum falling speed



  // LOD Logic
  const nearDistance = 40; // The distance at which chunks become detailed
  const farDistance = 80;  // The distance at which chunks become simple

  function updateChunks(playerPosition) {
    chunks.forEach(chunk => {
      const chunkCenter = chunk.position.clone().add(new THREE.Vector3(chunk.size / 2, chunk.size / 2, chunk.size / 2));
      const distance = playerPosition.distanceTo(chunkCenter);

      if (distance < nearDistance) {
        // Switch to detailed mesh
        if (!chunk.detailed) {
          if (chunk.simpleMesh) scene.remove(chunk.simpleMesh);
          if (chunk.detailedMesh) scene.add(chunk.detailedMesh);
          chunk.detailed = true;
        }
      } else if (distance > farDistance) {
        // Switch to simple mesh
        if (chunk.detailed) {
          if (chunk.detailedMesh) scene.remove(chunk.detailedMesh);
          if (chunk.simpleMesh) scene.add(chunk.simpleMesh);
          chunk.detailed = false;
        } else {
          // Also add simple mesh if it's not there (initial state)
          if (chunk.simpleMesh && !chunk.simpleMesh.parent) {
            scene.add(chunk.simpleMesh);
          }
        }
      }
    });
  }

  // Ensure renderer updates are synchronized with tick

  let lastChunkUpdate = 0;
  function tick(now) {

    now = now || performance.now();
    if (!tick.last) tick.last = now;

    // Update chunks periodically
    if (now - lastChunkUpdate > 1000) { // Update every 1 second
      updateChunks(player.position);
      lastChunkUpdate = now;
    }


    const dt = now - lastFrameTime;



    if (dt < FRAME_DURATION) {

      requestAnimationFrame(tick);

      return;

    }



    lastFrameTime = now;



    const deltaTime = Math.min(0.033, (now - tick.last) / 1000);

    tick.last = now;



    if (mode === 'player') {

      const isSneaking = keys.has('ShiftLeft') || keys.has('ShiftRight');

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

    if (hit) {

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

function centerFromVoxel(coord) {

  return coord + 0.5; // Assuming each voxel is 1x1x1, the center is at +0.5

}



// Ensure dummy is defined

const dummy = new THREE.Object3D();



boot().catch(err => console.error('Failed to initialize scene:', err));