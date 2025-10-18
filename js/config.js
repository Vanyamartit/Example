export const COLORS = {
  grass_top: null,
  grass_side: null,
  dirt: null,
  stone: null,
  oak_log_side: null,
  oak_log_top: null,
  oak_planks: null,
  // Special keys for multi-textured blocks
  grass: 'grass',
  oak_log: 'oak_log',
};

export const CUBE_FACES = [
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
