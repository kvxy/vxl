function ChunkMesh(data) {
  this.data = data;
  
  this.positions = [];
  this.texcoords = [];
  this.textures = [];
  
  this.onUpdate = function() {};
    
  this.load();
}

function vertexValue(v) {
  return v[0] + v[1] * 33 + v[2] * 1089;
}
function compareVertex(v0, v1) {
  const a = vertexValue(v0),
        b = vertexValue(v1);
  if (a > b) return 1;
  if (a === b) return 0;
  return 2;
}
function compareFaces(face0, face1) {
  const a = compareVertex(face0.slice(0, 3), face1.slice(0, 3));
  if (a !== 0) return a;
  const b = compareVertex(face0.slice(3, 6), face1.slice(3, 6));
  if (b !== 0) return b;
  const c = compareVertex(face0.slice(6, 9), face1.slice(6, 9));
  if (c !== 0) return c;
  const d = compareVertex(face0.slice(9, 12), face1.slice(9, 12));
  if (d !== 0) return d;
  return 0; // a == b
}

ChunkMesh.prototype.binarySearch = function(face) {
  let mid, min = 0, max = this.positions.length;
  while (min <= max) {
    mid = Math.floor((min + max) / 36) * 18;
    switch(compareFaces(face, this.positions.slice(mid, mid + 12))) { // only compare first 4 vertices
      case 0: return mid;
      case 1: min = mid + 18; break;
      case 2: max = mid - 18;
    }
  }
  return -1;
};
// returns where to insert face
ChunkMesh.prototype.binaryInsert = function(face) {
  let mid, min = 0, max = this.positions.length;
  while (min < max) {
    mid = Math.floor((min + max) / 36) * 18;
    switch(compareFaces(face, this.positions.slice(mid, mid + 12))) { // only compare first 4 vertices
      case 0: return -1; // face already exists
      case 1: min = mid + 18; break;
      case 2: max = mid;
    }
  }
  return min;
};

ChunkMesh.prototype.addFace = function(d, texture = 0) {
  const x = d[0], y = d[1], z = d[2],
        v0 = [x + d[3], y + d[4], z + d[5]],
        v1 = [x + d[6], y + d[7], z + d[8]],
        v2 = [x + d[9], y + d[10], z + d[11]],
        v3 = [x + d[12], y + d[13], z + d[14]],
        face = [...v0, ...v1, ...v2, ...v3, ...v2, ...v1],
        index = this.binaryInsert(face);
  if (index === -1) return; // face already exists
  // position
  this.positions.splice(index, 0, ...face);
  // texcoord
  this.texcoords.splice(
    index / 3 * 2, 0,
    0, 0,
    0, 1,
    1, 0,
    
    1, 1,
    1, 0,
    0, 1
  );
  this.textures.splice(index / 3, 0, texture, texture, texture, texture, texture, texture);
};
ChunkMesh.prototype.removeFace = function(d) {
  const x = d[0], y = d[1], z = d[2],
        index = this.binarySearch([x + d[3], y + d[4], z + d[5], x + d[6], y + d[7], z + d[8], x + d[9], y + d[10], z + d[11], x + d[12], y + d[13], z + d[14]]);
  if (index === -1) return;
  this.positions.splice(index, 3 * 6);
  this.texcoords.splice(index / 3 * 2, 2 * 6);
  this.textures.splice(index / 3, 6);
};
ChunkMesh.prototype.faceData = function(x, y, z, dir) {
  switch(dir) {
    case 0: return [ x, y, z, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0 ]; // positive x
    case 1: return [ x, y, z, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1 ]; // negative x
    case 2: return [ x, y, z, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1 ]; // positive y
    case 3: return [ x, y, z, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0 ]; // negative y
    case 4: return [ x, y, z, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1 ]; // positive z 
    case 5: return [ x, y, z, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0 ]; // negative z
  }
};

ChunkMesh.prototype.updateBlock = function(x, y, z, index, add) {
  let block = this.data.blocks[index];
  if ((add && block === 0) || (!add && block !== 0)) return;
  let i, tx, ty, tz;
  for (i = 0; i < 6; i ++) {
    tx = i === 0 ? 1 : i === 1 ? -1 : 0;
    ty = i === 2 ? 1 : i === 3 ? -1 : 0;
    tz = i === 4 ? 1 : i === 5 ? -1 : 0;
    if (add && this.data.getBlock(x + tx, y + ty, z + tz) === 0) { // transparent blocks only
      this.addFace(this.faceData(x, y, z, i), blockData[block].texture[i]);
    } else if (!add) { // delete all faces
      this.removeFace(this.faceData(x, y, z, i));
    }
  }
  this.onUpdate();
};
ChunkMesh.prototype.updateNeighbors = function(x, y, z, index, add) {
  const block = this.data.blocks[index];
  if ((add && block !== 0) || (!add && block === 0)) return;
  let i, tx, ty, tz, dir;
  for (i = 0; i < 6; i ++) {
    tx = i === 0 ? 1 : i === 1 ? -1 : 0;
    ty = i === 2 ? 1 : i === 3 ? -1 : 0;
    tz = i === 4 ? 1 : i === 5 ? -1 : 0;
    dir = i % 2 === 0 ? i + 1 : i - 1;
    let data = this.data.getBlockData(x + tx, y + ty, z + tz);
    if (data[0] > 0) {
      if (add) data[3].mesh.addFace(this.faceData(...data[1], dir), blockData[data[0]].texture[dir]);
      else data[3].mesh.removeFace(this.faceData(...data[1], dir));
      data[3].mesh.onUpdate();
    }
  }
};

// when new chunk gets loaded, update blocks neighboring it in neighboring chuncks
ChunkMesh.prototype.loadNeighbors = function(x, y, z, index) {
  let chunk, dir, block = this.data.blocks[index];
  if (block !== 0) return;
  const tx = (x === 31) - (x === 0),
        ty = (y === 31) - (y === 0),
        tz = (z === 31) - (z === 0);
  if (tx !== 0) {
    block = this.data.getBlock(x + tx, y, z);
    if (block > 0) {
      chunk = this.data.chunks[[this.data.x + tx, this.data.y, this.data.z]];
      dir = tx === -1 ? 0 : 1; 
      chunk.mesh.addFace(this.faceData(tx === -1 ? 31 : 0, y, z, dir), blockData[block].texture[dir]);
    }
  }
  if (ty !== 0) {
    block = this.data.getBlock(x, y + ty, z);
    if (block > 0) {
      chunk = this.data.chunks[[this.data.x, this.data.y + ty, this.data.z]];
      dir = ty === -1 ? 2 : 3; 
      chunk.mesh.addFace(this.faceData(x, ty === -1 ? 31 : 0, z, dir), blockData[block].texture[dir]);
    }
  }
  if (tz !== 0) {
    block = this.data.getBlock(x, y, z + tz);
    if (block > 0) {
      chunk = this.data.chunks[[this.data.x, this.data.y, this.data.z + tz]];
      dir = tz === -1 ? 4 : 5; 
      chunk.mesh.addFace(this.faceData(x, y, tz === -1 ? 31 : 0, dir), blockData[block].texture[dir]);
    }
  }
};

ChunkMesh.prototype.load = function() {
  let pos;
  for (let i = 0; i < 32 * 32 * 32; i ++) {
    pos = Chunk.indexToPos(i);
    this.updateBlock(...pos, i, true);
    this.loadNeighbors(...pos, i);
  }
};