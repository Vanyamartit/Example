/* global THREE */
import SimplexNoise from './lib/simplex-noise.js';
import { COLORS, CUBE_FACES } from './config.js';
import { initMainMenu } from './ui/menu.js';
import { showCraftingUI, hideCraftingUI } from './crafting.js';


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

let selectedHotbarIndex = 0;
let hotbarItems = [];

function updateHotbarUI() {
    hotbarItems.forEach((item, index) => {
        const slot = document.getElementById(`slot-${index + 1}`);
        if (slot) {
            let countElement = slot.querySelector('.hotbar-count');
            if (!countElement) {
                countElement = document.createElement('div');
                countElement.className = 'hotbar-count';
                slot.appendChild(countElement);
            }

            if (item && item.icon) {
                slot.style.backgroundImage = `url(${item.icon})`;
                if (item.count > 1 && item.count !== Infinity) {
                    countElement.textContent = item.count;
                    countElement.style.display = 'block';
                } else {
                    countElement.style.display = 'none';
                }
            } else {
                slot.style.backgroundImage = 'none';
                countElement.style.display = 'none';
            }

            if (index === selectedHotbarIndex) {
                slot.classList.add('selected');
            } else {
                slot.classList.remove('selected');
            }
        }
    });
}

async function boot() {
  const { gameMode, worldType } = await initMainMenu();
  runGame(gameMode, worldType);
}

async function runGame(gameMode, worldType) {
    const textureLoader = new THREE.TextureLoader();
    
    // Promisify texture loading
    const loadTexture = (url) => {
      return new Promise((resolve, reject) => {
        textureLoader.load(url, resolve, undefined, reject);
      });
    };

    // Wait for all textures to load before proceeding
    const [
      dirtTexture,
      stoneTexture,
      grassTopTexture,
      grassSideTexture,
      oakLogTexture,
      oakLogTopTexture,
      oakPlanksTexture
    ] = await Promise.all([
      loadTexture('assets/textures/Dirt.png').catch(e => console.error("Failed to load dirt texture", e)),
      loadTexture('assets/textures/stone.png').catch(e => console.error("Failed to load stone texture", e)),
      loadTexture('assets/textures/Grass_block_on_top.png').catch(e => console.error("Failed to load grass_top texture", e)),
      loadTexture('assets/textures/Grass_block.png').catch(e => console.error("Failed to load grass_side texture", e)),
      loadTexture('assets/textures/Oak_Log.png').catch(e => console.error("Failed to load oak_log texture", e)),
      loadTexture('assets/textures/Oak_Log_on_top_and_down.png').catch(e => console.error("Failed to load oak_log_top texture", e)),
      loadTexture('assets/textures/Oak_Planks.png').catch(e => console.error("Failed to load oak_planks texture", e)),
    ]);

    COLORS.dirt = new THREE.MeshStandardMaterial({ map: dirtTexture, roughness: 0.9, name: 'dirt' });
    COLORS.stone = new THREE.MeshStandardMaterial({ map: stoneTexture, roughness: 0.9, name: 'stone' });
    COLORS.grass_top = new THREE.MeshStandardMaterial({ map: grassTopTexture, roughness: 0.9, name: 'grass_top' });
    COLORS.grass_side = new THREE.MeshStandardMaterial({ map: grassSideTexture, roughness: 0.9, name: 'grass_side' });
    COLORS.oak_log_side = new THREE.MeshStandardMaterial({ map: oakLogTexture, roughness: 0.9, name: 'oak_log_side' });
    COLORS.oak_log_top = new THREE.MeshStandardMaterial({ map: oakLogTopTexture, roughness: 0.9, name: 'oak_log_top' });
    COLORS.oak_planks = new THREE.MeshStandardMaterial({ map: oakPlanksTexture, roughness: 0.9, name: 'oak_planks' });

    const style = document.createElement('style');
    style.innerHTML = `
    .hotbar-count {
      position: absolute;
      bottom: 2px;
      right: 2px;
      color: white;
      background: rgba(0,0,0,0.5);
      padding: 1px 3px;
      border-radius: 2px;
      font-size: 10px;
    }
    `;
    document.head.appendChild(style);

    const blockData = {
      grass: { hardness: 1, tool: 'hand' },
      dirt: { hardness: 1, tool: 'hand' },
      stone: { hardness: Infinity, tool: 'pickaxe' },
      oak_log: { hardness: 3, tool: 'axe' },
      oak_planks: { hardness: 2, tool: 'axe' },
      crafting_table: { hardness: 2, tool: 'axe' },
      oak_leaves: { hardness: 0.2, tool: 'hand' },
    };

    const blockTypes = {
      grass: { material: COLORS.grass, icon: 'assets/textures/Grass_block_on_top.png', data: blockData.grass },
      dirt: { material: COLORS.dirt, icon: 'assets/textures/Dirt.png', data: blockData.dirt },
      stone: { material: COLORS.stone, icon: 'assets/textures/stone.png', data: blockData.stone },
      oak_log: { material: COLORS.oak_log, icon: 'assets/textures/Oak_Log.png', data: blockData.oak_log },
      oak_planks: { material: COLORS.oak_planks, icon: 'assets/textures/Oak_Planks.png', data: blockData.oak_planks },
      crafting_table: { material: COLORS.oak_planks, icon: 'assets/textures/Oak_Planks.png', data: blockData.crafting_table },
    };

    if (gameMode === 'creative') {
      hotbarItems = [
        { ...blockTypes.stone, count: Infinity },
        { ...blockTypes.dirt, count: Infinity },
        { ...blockTypes.oak_log, count: Infinity },
        { ...blockTypes.oak_planks, count: Infinity },
        { ...blockTypes.crafting_table, count: Infinity }
      ];
    } else {
      hotbarItems = [null, null, null, null, null];
    }
    updateHotbarUI();

    // Ensure THREE exists (use only local file)
    if (!window.THREE) {
      console.error('Failed to load THREE.js. Ensure the file exists at ./vendor/three.min.js');
      return;
    }

    const app = document.getElementById('app');
    const settingsMenu = document.getElementById('settings-menu');
    const sensitivitySlider = document.getElementById('sensitivity-slider');
    const craftingContainer = document.getElementById('crafting-container');

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

    let SENS = 0.0025;

    const keys = {
      forward: 'KeyW',
      backward: 'KeyS',
      left: 'KeyA',
      right: 'KeyD',
      jump: 'Space',
      sprint: 'ControlLeft',
      sneak: 'ShiftLeft'
    };
    const pressedKeys = new Set();
    const pressedMouseButtons = new Set();

    let lastWPress = 0;
    let isSprinting = false;
    const sprintSpeedMultiplier = 5.0 / pAccel;
    let lastSpacePress = 0;
    let flightMode = gameMode === 'creative';
    let spaceInterval = null;

    function updateKeyBindings() {
      for (const key in keys) {
        document.getElementById(`bind-${key}`).textContent = keys[key];
      }
    }

    function bindKey(key) {
      const button = document.getElementById(`bind-${key}`);
      button.textContent = '...';
      const keydownListener = (e) => {
        keys[key] = e.code;
        updateKeyBindings();
        window.removeEventListener('keydown', keydownListener);
      };
      window.addEventListener('keydown', keydownListener);
    }

    updateKeyBindings();

    for (const key in keys) {
      document.getElementById(`bind-${key}`).addEventListener('click', () => bindKey(key));
    }

    sensitivitySlider.addEventListener('input', (e) => {
      SENS = parseFloat(e.target.value);
    });

    let pointerLockPending = false;

    window.addEventListener('keydown', (e) => {
      if (e.code.startsWith('Digit')) {
          const digit = parseInt(e.code.slice(5), 10);
          if (digit >= 1 && digit <= 5) {
              selectedHotbarIndex = digit - 1;
              updateHotbarUI();
          }
      }

      if (e.code === 'Escape') {
        if (settingsMenu.style.display === 'none') {
          settingsMenu.style.display = 'block';
          document.exitPointerLock();
          mode = 'menu';
        } else {
          settingsMenu.style.display = 'none';
          mode = 'player';
          if (!pointerLockPending) {
            pointerLockPending = true;
            canvas.requestPointerLock({
              unadjustedMovement: true,
            }).catch((err) => {
              console.error('Pointer lock failed:', err);
              pointerLockPending = false;
            });
          }
        }
      }
      if (e.code === 'KeyE') {
        if (craftingContainer.style.display === 'none') {
          showCraftingUI();
          document.exitPointerLock();
          mode = 'menu';
        } else {
          hideCraftingUI();
          mode = 'player';
          if (!pointerLockPending) {
            pointerLockPending = true;
            canvas.requestPointerLock({
              unadjustedMovement: true,
            }).catch((err) => {
              console.error('Pointer lock failed:', err);
              pointerLockPending = false;
            });
          }
        }
      }
      if (e.code === keys.jump) {
        if (e.repeat) return; // Use the .repeat property to ignore OS key repeats

        const now = performance.now();
        // Clear any interval from a previous single tap that was too short to be a hold
        clearInterval(spaceInterval);
        spaceInterval = null;

        if (gameMode === 'creative' && now - lastSpacePress < 300) { // Double-tap for flight
            flightMode = !flightMode;
            pVelY = 0;
        } else { // Single tap or start of hold
            if (onGround) {
                pVelY = jumpSpeed;
                onGround = false;
            }
            // Set interval for holding
            spaceInterval = setInterval(() => {
                if (onGround) {
                    pVelY = jumpSpeed;
                    onGround = false;
                }
            }, 200);
        }
        lastSpacePress = now;
      }
      pressedKeys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === keys.jump) {
        clearInterval(spaceInterval);
        spaceInterval = null;
      }
      pressedKeys.delete(e.code);
    });

    canvas.addEventListener('click', () => {
      if (mode === 'player' && document.pointerLockElement !== canvas && !pointerLockPending) {
        pointerLockPending = true;
        canvas.requestPointerLock({
          unadjustedMovement: true,
        }).catch((err) => {
          console.error('Pointer lock failed:', err);
          pointerLockPending = false;
        });
      }
    });

    let breakingBlock = null;
    let breakingStartTime = 0;
    let breakingDuration = 0;

    canvas.addEventListener('mousedown', (e) => {
      if (mode === 'player' && document.pointerLockElement === canvas) {
        handleBlockInteraction(e.button, 'down');
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (mode === 'player' && document.pointerLockElement === canvas) {
        handleBlockInteraction(e.button, 'up');
      }
    });

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === canvas) {
        mode = 'player';
        pointerLockPending = false;
      } else {
        mode = 'menu'; // Switch to menu mode or handle appropriately
        pointerLockPending = false;
        handleBlockInteraction(0, 'up'); // Cancel breaking
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (mode === 'player' && document.pointerLockElement === canvas) {
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
        this.boundingBox = new THREE.Box3(
          this.position.clone(),
          this.position.clone().add(new THREE.Vector3(size, size, size))
        );
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
    
          if (material === COLORS.grass) {
            meshMaterial = [
              COLORS.grass_side, // right
              COLORS.grass_side, // left
              COLORS.grass_top,  // top
              COLORS.dirt,       // bottom
              COLORS.grass_side, // front
              COLORS.grass_side  // back
            ];
          } else if (material === COLORS.oak_log) {
            meshMaterial = [
              COLORS.oak_log_side, // right
              COLORS.oak_log_side, // left
              COLORS.oak_log_top,  // top
              COLORS.oak_log_top,  // bottom
              COLORS.oak_log_side, // front
              COLORS.oak_log_side  // back
            ];
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
          const height = worldType === 'flat' ? 0 : Math.floor((noise2D.noise2D(worldX * TERRAIN_SCALE, worldZ * TERRAIN_SCALE) + 1) * 0.5 * HEIGHT_SCALE);

          for (let y = 0; y < CHUNK_SIZE; y++) {
            const worldY = cy + y;
            if (worldY <= height) {
              // Cave generation
              if (worldType !== 'flat') {
                  const caveNoise = (noise3D.noise3D(worldX * CAVE_SCALE, worldY * CAVE_SCALE, worldZ * CAVE_SCALE) + 1) * 0.5;
                  if (worldY < height -1 && caveNoise > CAVE_THRESHOLD) { // Keep top layer solid
                    continue; // Carve out a cave
                  }
              }

              const key = keyOf(worldX, worldY, worldZ);
              voxels.add(key);
              const color = worldY === height ? COLORS.grass : worldY > height - 3 ? COLORS.dirt : COLORS.stone;
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
      let ix = Math.floor(sx), iy = Math.floor(sy), iz = Math.floor(sz);
      const stepX = d.x > 0 ? 1 : -1, stepY = d.y > 0 ? 1 : -1, stepZ = d.z > 0 ? 1 : -1;
      const invDx = 1 / Math.abs(d.x), invDy = 1 / Math.abs(d.y), invDz = 1 / Math.abs(d.z);
      let tMaxX = (ix + (d.x > 0 ? 1 : 0) - sx) / d.x;
      let tMaxY = (iy + (d.y > 0 ? 1 : 0) - sy) / d.y;
      let tMaxZ = (iz + (d.z > 0 ? 1 : 0) - sz) / d.z;
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

    function handleBlockInteraction(button, action) {
      if (mode !== 'player' || (document.pointerLockElement !== canvas && action !== 'up')) return;

      if (button === 0) { // Left-click
          if (action === 'down') {
              const rayOrigin = player.position.clone().add(new THREE.Vector3(0, eyeHeight, 0));
              const rayDirection = new THREE.Vector3();
              camera.getWorldDirection(rayDirection);
              const res = voxelRaycast(rayOrigin, rayDirection, 6);
              if (!res) return;

              if (gameMode === 'creative') {
                  destroyBlock(res.voxel);
                  return;
              }

              // Survival mode logic
              const k = keyOf(res.voxel.x, res.voxel.y, res.voxel.z);
              const material = voxelColors.get(k);
              const blockName = Object.keys(blockTypes).find(name => {
                  const b = blockTypes[name];
                  if (b.material === COLORS.grass) { // Special case for grass block string
                    return material === COLORS.grass;
                  }
                  if (Array.isArray(b.material)) return b.material.includes(material);
                  return b.material === material;
              });

              if (!blockName || blockTypes[blockName].data.hardness === Infinity) {
                  return; // Cannot break this block
              }

              // Start breaking
              breakingBlock = res.voxel;
              breakingStartTime = performance.now();
              breakingDuration = blockTypes[blockName].data.hardness * 1000;

          } else if (action === 'up') {
              // Cancel breaking
              breakingBlock = null;
              breakingStartTime = 0;
              breakingDuration = 0;
          }
      }

      if (button === 2 && action === 'down') { // Right-click for placing blocks
        const rayOrigin = player.position.clone().add(new THREE.Vector3(0, eyeHeight, 0));
        const rayDirection = new THREE.Vector3();
        camera.getWorldDirection(rayDirection);
        const res = voxelRaycast(rayOrigin, rayDirection, 6);
        if (!res) return;

        const selectedItem = hotbarItems[selectedHotbarIndex];
        if (!selectedItem) return; // Don't place if slot is empty

        if (gameMode === 'survival' && selectedItem.count === 0) {
          return;
        }

        const nx = res.voxel.x + res.normal.x, ny = res.voxel.y + res.normal.y, nz = res.voxel.z + res.normal.z;
        const k = keyOf(nx, ny, nz);
        const aabb = playerAABB();
        const vminX = nx, vmaxX = nx + 1, vminY = ny, vmaxY = ny + 1, vminZ = nz, vmaxZ = nz + 1;
        const overlap = (minA, maxA, minB, maxB) => (maxA > minB) && (minA < maxB);
        if (!voxels.has(k) && !(overlap(aabb.minX, aabb.maxX, vminX, vmaxX) && overlap(aabb.minY, aabb.maxY, vminY, vmaxY) && overlap(aabb.minZ, aabb.maxZ, vminZ, vmaxZ))) {
          voxels.add(k);
          voxelColors.set(k, selectedItem.material);
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

          if (gameMode === 'survival') {
            selectedItem.count--;
            if (selectedItem.count === 0) {
              hotbarItems[selectedHotbarIndex] = null;
            }
            updateHotbarUI();
          }
        }
      }
    }

    function tick(now) {
      now = now || performance.now();
      if (!tick.last) {
        tick.last = now;
        updateChunks(player.position);
        placeSpawnOnTop();
      }

      // Update chunks periodically
      if (now - (tick.lastChunkUpdate || 0) > 500) {
        updateChunks(player.position);
        tick.lastChunkUpdate = now;
      }

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
      
      const isSneaking = pressedKeys.has(keys.sneak);

      if (mode === 'player') {
        const isSprinting = pressedKeys.has(keys.sprint) && pressedKeys.has(keys.forward) && !isSneaking;
        const sprintSpeedMultiplier = 5.0 / pAccel;

        let currentAccel = isSneaking ? pAccel * 0.4 : pAccel;

        if (isSprinting) currentAccel *= sprintSpeedMultiplier;
        
        const forward = new THREE.Vector3(-Math.sin(pyaw), 0, -Math.cos(pyaw));
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
        let wish = new THREE.Vector3();

        if (pressedKeys.has(keys.forward)) wish.add(forward);
        if (pressedKeys.has(keys.backward)) wish.sub(forward);
        if (pressedKeys.has(keys.left)) wish.sub(right);
        if (pressedKeys.has(keys.right)) wish.add(right);

        wish.normalize();

        const wishVel = new THREE.Vector3(wish.x, 0, wish.z).multiplyScalar(currentAccel);

        if (flightMode) {
          pVelocity.lerp(wishVel, pDamp * deltaTime);
          pVelY = 0;
          if (pressedKeys.has(keys.jump)) pVelY = currentAccel;
          if (pressedKeys.has(keys.sprint) || pressedKeys.has('ControlRight')) pVelY = -currentAccel;
          
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

      if (breakingBlock) {
          const isLookingAtSameBlock = hit && hit.voxel.x === breakingBlock.x && hit.voxel.y === breakingBlock.y && hit.voxel.z === breakingBlock.z;

          if (!isLookingAtSameBlock) {
              // Player looked away, cancel breaking
              handleBlockInteraction(0, 'up');
          } else {
              const elapsedTime = performance.now() - breakingStartTime;
              if (elapsedTime >= breakingDuration) {
                  destroyBlock(breakingBlock);
                  handleBlockInteraction(0, 'up'); // Stop breaking after success
              }
          }
      }

      if (hit) { // The center of the outline should be the center of the voxel
        outline.position.set(hit.voxel.x + 0.5, hit.voxel.y + 0.5, hit.voxel.z + 0.5);
        outline.visible = true;
      } else {
        outline.visible = false;
      }

      renderer.render(scene, camera);
      updateFPSCounter();
      requestAnimationFrame(tick);
    }

    function destroyBlock(voxel) {
      const kDel = keyOf(voxel.x, voxel.y, voxel.z);
      if (voxels.delete(kDel)) {
        const material = voxelColors.get(kDel);
        voxelColors.delete(kDel);
        const chunk = getChunkForVoxel(voxel.x, voxel.y, voxel.z);
        if (chunk) {
            chunk.voxels.delete(kDel);
            rebuildChunk(chunk);
        }
        if (gameMode === 'survival') {
          let blockNameToAdd;
          if (material === COLORS.grass) {
            blockNameToAdd = 'dirt';
          } else if (material === COLORS.oak_log) {
            blockNameToAdd = 'oak_log';
          } else if (material && material.name) {
            blockNameToAdd = material.name;
          }

          if (blockNameToAdd && blockTypes[blockNameToAdd]) {
            const block = blockTypes[blockNameToAdd];
            const existingItemIndex = hotbarItems.findIndex(item => item && item.material === block.material);
            if (existingItemIndex > -1) {
              hotbarItems[existingItemIndex].count++;
            } else {
              const emptySlotIndex = hotbarItems.findIndex(item => item === null);
              if (emptySlotIndex > -1) {
                hotbarItems[emptySlotIndex] = { ...block, count: 1 };
              }
            }
            updateHotbarUI();
          }
        }
      }
    }

    function getChunkForVoxel(vx, vy, vz) {
        const cx = Math.floor(vx / CHUNK_SIZE) * CHUNK_SIZE;
        const cy = Math.floor(vy / CHUNK_SIZE) * CHUNK_SIZE;
        const cz = Math.floor(vz / CHUNK_SIZE) * CHUNK_SIZE;
        const chunkKey = keyOf(cx, cy, cz);
        return chunks.get(chunkKey);
    }

    function rebuildChunk(chunk) {
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
    }

    function placeSpawnOnTop() {
      const sx = 0, sz = 0;
      let maxVy = -Infinity;
      voxels.forEach((k) => {
        const [vx, vy, vz] = k.split(',').map(Number);
        if (vx === sx && vz === sz) maxVy = Math.max(maxVy, vy);
      });
      if (isFinite(maxVy)) {
        player.position.set(sx + 0.5, maxVy + 1, sz + 0.5);
        pVelY = 0;
        onGround = true;
      }
    }

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
                  if (isDown) {
                    const penetration = surface - a.minY;
                    player.position.y += penetration + eps;
                    onGround = true;
                  } else { // Moving up
                    const penetration = a.maxY - surface;
                    player.position.y -= (penetration + eps);
                  }
                  pVelY = 0;
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
      fpsCounter.textContent = `FPS: ${fps}` + (flightMode ? ' (Flight)' : '');
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
  return coord + 0.5;
}

// Ensure dummy is defined
const dummy = new THREE.Object3D();

try {
  boot().catch(err => console.error('Failed to initialize scene:', err));
} catch (err) {
  console.error('Error during boot:', err);
}
nsole.error('Error during boot:', err);
}
