// holds all data regarding chunk
function ChunkData(blocks, chunks, x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
  this.blocks = blocks;
  this.chunks = chunks;
};

// all data
ChunkData.prototype.getBlockData = function(x, y, z) {
  const tx = (x === 32) - (x === -1),
        ty = (y === 32) - (y === -1),
        tz = (z === 32) - (z === -1);
  if (tx + ty + tz !== 0) {
    let chunk = this.chunks[[this.x + tx, this.y + ty, this.z + tz]],
        pos = [tx === 0 ? x : tx === 1 ? 0 : 31, ty === 0 ? y : ty === 1 ? 0 : 31, tz === 0 ? z : tz === 1 ? 0 : 31],
        index = Chunk.posToIndex(...pos);
    return chunk === undefined ? [-1] : [ chunk.data.blocks[index], pos, index, chunk ];
  }
  let index = Chunk.posToIndex(x, y, z);
  return [ this.blocks[index], [x, y, z], index, this.chunks[[this.x, this.y, this.z]] ];
}
// returns only block value
ChunkData.prototype.getBlock = function(x, y, z) {
  const tx = (x === 32) - (x === -1),
        ty = (y === 32) - (y === -1),
        tz = (z === 32) - (z === -1);
  if (tx + ty + tz !== 0) {
    let chunk = this.chunks[[this.x + tx, this.y + ty, this.z + tz]];
    return chunk === undefined ? -1 : chunk.data.blocks[Chunk.posToIndex(tx === 0 ? x : tx === 1 ? 0 : 31, ty === 0 ? y : ty === 1 ? 0 : 31, tz === 0 ? z : tz === 1 ? 0 : 31)];
  }
  return this.blocks[Chunk.posToIndex(x, y, z)];
};

// chunk export
function Chunk(blocks, chunks, x, y, z) {
  this.data = new ChunkData(blocks, chunks, x, y, z);
  this.mesh = new ChunkMesh(this.data);
  
  this.x = x;
  this.y = y;
  this.z = z;
}

Chunk.prototype.removeBlock = function(x, y, z, index) {
  this.data.blocks[index] = 0;
  this.mesh.updateBlock(x, y, z, index, false);
  this.mesh.updateNeighbors(x, y, z, index, true);
};
Chunk.prototype.addBlock = function(x, y, z, block, index) {
  this.data.blocks[index] = block;
  this.mesh.updateBlock(x, y, z, index, true);
  this.mesh.updateNeighbors(x, y, z, index, false);
};

Chunk.size = 32;
Chunk.posToIndex = function(x, y, z) {
  return x + y * 32 + z * 1024;
};
Chunk.indexToPos = function(n) {
  return [n % 32, (n >>> 5) % 32, (n >>> 10) % 32];
};