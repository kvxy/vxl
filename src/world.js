
function World() {
  this.chunks = {};
  
  this.seed = Date.now();
  //this.seed = 1627964530827;
  this.noise = new SimplexNoise(new Alea(this.seed));
    
  this.renderer = new WorldRenderer(this.chunks);
  for (let x = -2; x < 3; x ++) {
    //for (let y = 0; y < 10; y ++) {
      for (let z = -2; z < 3; z ++) {
        this.generateChunk(x, 0, z);
      }
    //}
  }
}

World.prototype.getBlockData = function(x, y, z) {
  let chunk = this.chunks[[Math.floor(x / 32), Math.floor(y / 32), Math.floor(z / 32)]];
  if (chunk === undefined) return -1;
  let pos = [ x % 32, y % 32, z % 32 ];
  if (pos[0] < 0) pos[0] += 32;
  if (pos[1] < 0) pos[1] += 32;
  if (pos[2] < 0) pos[2] += 32;
  let index = Chunk.posToIndex(...pos);
  return [ chunk.data.blocks[index], pos, index, chunk ];
};

function cdist(c, v) {
  if (v === 0) return Infinity;
  return v > 0 ? (1 - c % 1) / v : (c - Math.ceil(c - 1)) / -v;
}
World.prototype.raycast = function(x, y, z, rx, ry, radius) {
  let fx = radius + x % 1, fy = radius + y % 1, fz = radius + z % 1;
  let i, dist, block = this.getBlockData(Math.floor(x), Math.floor(y), Math.floor(z)), pblock = -1;
  if (block[0] !== 0) return [block, -1];
  const vz = -Math.cos(ry) * Math.cos(rx),
        vx = -Math.sin(ry) * Math.cos(rx),
        vy = -Math.sin(rx);
  
  for (i = 0; i < radius; i ++) {
    dist = Math.min(cdist(fx, vx), cdist(fy, vy), cdist(fz, vz));
    fx += vx * dist;
    fy += vy * dist;
    fz += vz * dist;
    block = this.getBlockData(
      vx > 0 ? Math.floor(x + fx - x % 1 - radius) : Math.ceil(x + fx - x % 1 - radius - 1), 
      vy > 0 ? Math.floor(y + fy - y % 1 - radius) : Math.ceil(y + fy - y % 1 - radius - 1), 
      vz > 0 ? Math.floor(z + fz - z % 1 - radius) : Math.ceil(z + fz - z % 1 - radius - 1)
    );
    if (block[0] !== 0) return [block, pblock];
    else pblock = block;
  }
  return -1;
};

function sigmoid(t) {
  return 1 / (1 + Math.pow(Math.E, -t));
}
World.prototype.height = function(x, z) {
  let a = (this.noise.noise2D(x / 100, z / 100) + 1) * 0.5 * 10;
  let b = (this.noise.noise2D(x / 40, (z + 10000) / 40) + 1) * 0.5 * 10;
  let c = (this.noise.noise2D(x / 60, (z + 20000) / 60) + 1) * 0.5 * 8;
  let d = c;
  c *= c;
  if (c < 30) c = 0;
  else {
    c -= 30;
    let s = 24;
    let sig = sigmoid(c / 30 * s * 2 - s);
    c = sig * 10;
  }
  
  return Math.floor(a + b + c);
}

World.prototype.generateChunk = function(x, y, z) {
  const blocks = [],
        noiseMap = [];
  // generate noise map for chunk
  let nx, nz;
  for (nx = 0; nx < Chunk.size; nx ++) {
    noiseMap.push([]);
    for (nz = 0; nz < Chunk.size; nz ++) {
      noiseMap[nx].push(this.height(nx + x * Chunk.size, nz + z * Chunk.size));
    }
  }
  // fill blocks
  for (let i = 0; i < Chunk.size * Chunk.size * Chunk.size; i ++) {
    let p = Chunk.indexToPos(i);
    let height = noiseMap[p[0]][p[2]]
    blocks.push((p[1] < height - 2) ? 3 : (p[1] < height - 1) ? (Math.random() < 0.3 ? 1 : 3) : (p[1] < height) ? 1 : (p[1] === height) ? 2 : 0);
  }
  // render
  const chunk = this.chunks[[x, y, z]] = new Chunk(blocks, this.chunks, x, y, z);
  setTimeout(() => {
    this.renderer.newChunk(chunk);
  }, 1); // works... but it's pretty cringe
};