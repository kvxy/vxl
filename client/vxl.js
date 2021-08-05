
/** blockdata.js **/


const blockData = [
  { name: 'air' },
  {
    name: 'dirt',
    texture: [0, 0, 0, 0, 0, 0]
  },
  {
    name: 'grass',
    texture: [1, 1, 2, 0, 1, 1]
  },
  {
    name: 'stone',
    texture: [3, 3, 3, 3, 3, 3]
  }
];


/** camera.js **/

const keymap = {
  87: 'forward',
  83: 'back',
  65: 'left',
  68: 'right',
  
  32: 'up',
  16: 'down',
  
  17: 'lock' // ctrl
}, input = {
  forward: false,
  back: false,
  left: false,
  right: false,
  
  up: false,
  down: false,
  
  lock: false,
};

// basic movement for now
function Camera(x, y, z, rx, ry, rz, canvas) {
  this.x = x;
  this.y = y;
  this.z = z;
  
  this.rx = rx;
  this.ry = ry;
  this.rz = rz;
    
  this.canvas = canvas;
  
  window.addEventListener('mousemove', (e) => {
    this.ry -= e.movementX / 500;
    this.rx += e.movementY / 500;
    if (this.rx > Math.PI / 2) this.rx = Math.PI / 2;
    if (this.rx < -Math.PI / 2) this.rx = -Math.PI / 2;
  });
  
  window.addEventListener('mousedown', () => { 
    if (event.button === 0) this.leftClick();
    else if (event.button === 2) this.rightClick();
  });
}

Camera.prototype.leftClick = function() {
  let data = window.world.raycast(-this.x, -this.y, -this.z, this.rx, this.ry, 10);
  if (data !== -1 && data[0] !== -1) data[0][3].removeBlock(...data[0][1], data[0][2]);
};
Camera.prototype.rightClick = function() {
  let data = window.world.raycast(-this.x, -this.y, -this.z, this.rx, this.ry, 10);
  if (data !== -1 && data[0] !== -1 && data[1] !== -1) data[1][3].addBlock(...data[1][1], 3, data[1][2]);
};

const xyzElem = document.getElementById('xyz');
Camera.prototype.tick = function() {
  const speed = 0.2;
  if (input.forward) {
    this.z += Math.cos(this.ry) * speed;
    this.x += Math.sin(this.ry) * speed;
  }
  if (input.back) {
    this.z -= Math.cos(this.ry) * speed;
    this.x -= Math.sin(this.ry) * speed;
  }
  if (input.right) {
    this.z -= Math.cos(this.ry + Math.PI / 2) * speed;
    this.x -= Math.sin(this.ry + Math.PI / 2) * speed;
  }
  if (input.left) {
    this.z += Math.cos(this.ry + Math.PI / 2) * speed;
    this.x += Math.sin(this.ry + Math.PI / 2) * speed;
  }

  if (input.up) this.y -= speed;
  if (input.down) this.y += speed;

  if (input.lock) this.canvas.requestPointerLock();
  
  xyzElem.textContent = `${Math.floor(-this.x)} ${Math.floor(-this.y)} ${Math.floor(-this.z)}`;
};

window.addEventListener('keydown', () => { 
  input[keymap[event.keyCode]] = true;
});
window.addEventListener('keyup', () => {
  input[keymap[event.keyCode]] = false;
});


/** chunk.js **/

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


/** chunkMesh.js **/

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


/** main.js **/

const fpsElem = document.getElementById('fps');

let then = 0;
let tick = 0;
function fps(now) {
  now *= 0.001;
  const deltaTime = now - then;
  then = now;
  const fps = 1 / deltaTime * 10;
  fpsElem.textContent = fps.toFixed(1);
}

window.onload = function() {
  let world = window.world = new World();
  
  draw();
  function draw(now) {
    if (world.renderer.draw) world.renderer.draw();
    
    if (tick % 10 === 0) fps(now);
    tick ++;
    
    requestAnimationFrame(draw);
  }
};



/** matrix.js **/

function mat4() {
  this.data = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];
}

mat4.prototype.perspective = function(fov, aspect, near, far) {
  let fy = 1 / Math.tan(fov / 2),
      fx = fy / aspect,
      nf = 1 / (near - far),
      a  = (near + far) * nf,
      b  = 2 * near * far * nf;
  this.data = [
    fx, 0,  0,  0,
    0,  fy, 0,  0,
    0,  0,  a, -1,
    0,  0,  b,  0
  ];
};
mat4.prototype.translate = function(x, y, z) {
  let d = this.data;
  d[12] += x * d[0] + y * d[4] + z * d[8];
  d[13] += x * d[1] + y * d[5] + z * d[9];
  d[14] += x * d[2] + y * d[6] + z * d[10];
  d[15] += x * d[3] + y * d[7] + z * d[11];
};
mat4.prototype.rotateX = function(theta) {
  let d = this.data,
      s = Math.sin(theta),
      c = Math.cos(theta),
      d4 = d[4], d5 = d[5], d6 = d[6],   d7 = d[7],
      d8 = d[8], d9 = d[9], d10 = d[10], d11 = d[11];
  d[4]  =  c * d4 + s * d8;
  d[5]  =  c * d5 + s * d9;
  d[6]  =  c * d6 + s * d10;
  d[7]  =  c * d7 + s * d11;
  d[8]  = -s * d4 + c * d8;
  d[9]  = -s * d5 + c * d9;
  d[10] = -s * d6 + c * d10;
  d[11] = -s * d7 + c * d11;
};
mat4.prototype.rotateY = function(theta) {
  let d = this.data,
      s = Math.sin(theta),
      c = Math.cos(theta),
      d0 = d[0], d1 = d[1], d2 = d[2],   d3 = d[3],
		  d8 = d[8], d9 = d[9], d10 = d[10], d11 = d[11];
  d[0]  =  c * d0 + s * d8;
  d[1]  =  c * d1 + s * d9;
  d[2]  =  c * d2 + s * d10;
  d[3]  =  c * d3 + s * d11;
  d[8]  = -s * d0 + c * d8;
  d[9]  = -s * d1 + c * d9;
  d[10] = -s * d2 + c * d10;
  d[11] = -s * d3 + c * d11;
};
mat4.prototype.rotateZ = function(theta) {
  let d = this.data,
      s = Math.sin(theta),
      c = Math.cos(theta),
      a0 = d[0], a1 = d[1], a2 = d[2],   a3 = d[3],
      d4 = d[4], d5 = d[5], d6 = d[6],   d7 = d[7];
  d[0] =  c * a0 + s * d4;
  d[1] =  c * a1 + s * d5;
  d[2] =  c * a2 + s * d6;
  d[3] =  c * a3 + s * d7;
  d[4] = -s * a0 + c * d4;
  d[5] = -s * a1 + c * d5;
  d[6] = -s * a2 + c * d6;
  d[7] = -s * a3 + c * d7;
};


/** renderer.js **/

function Renderer(canvas, vertSrc, fragSrc) {
  this.canvas = canvas;
  const gl = this.gl = canvas.getContext('webgl2');
  if (!gl) return console.error('no gl :(');

  // vertex shader
  const vertShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertShader, vertSrc);
  gl.compileShader(vertShader);

  if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) 
    return console.log(gl.getShaderInfoLog(vertShader));

  // fragment shader
  const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragShader, fragSrc);
  gl.compileShader(fragShader);

  if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS))
    return console.log(gl.getShaderInfoLog(fragShader));
  
  const program = this.program =  gl.createProgram();
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    return console.log(gl.getProgramInfoLog(program));
  
  gl.useProgram(program);
};

Renderer.prototype.assignAttrib = function(name, buffer, size, type, stride, offset = 0) {
  const gl = this.gl,
        loc = gl.getAttribLocation(this.program, name);
  gl.enableVertexAttribArray(loc);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(loc, size, type, false, stride, offset);
};
  
Renderer.prototype.createTexture = function(url) {
  const gl = this.gl,
        texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 255, 255]));

  let image = new Image(); 
  image.src = url;
  image.addEventListener('load', function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    console.log(texture)
  });
};

let getImageData = new Promise((resolve, reject) => {
  
});
Renderer.prototype.createTextureArray = async function(urls, width, height) {
  const gl = this.gl,
        texture = gl.createTexture(),
        pixels = [];
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
  gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 255, 255]));
  for (let url of urls) {
    let image = new Image();
    image.src = url;
    await new Promise((resolve, reject) => {
      image.addEventListener('load', function() {
        let canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        let ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        pixels.push(...new Uint8Array(ctx.getImageData(0, 0, width, height).data.buffer));
        resolve();
      });
    });
  }
  
  gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA, width, height, urls.length, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(pixels));
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
  return texture;
};


/** world.js **/


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


/** worldRenderer.js **/

const vertSrc = 
` #version 300 es

  precision highp float;
  precision highp int;
  
  uniform mat4 projection;
  uniform mat4 camera;
  uniform mat4 model;
  
  in vec4 a_position;
  in vec2 a_texcoord;
  in float a_texture;
  
  out vec2 v_texcoord;
  out float f_texture;

  void main() {
    gl_Position = projection * camera * model * a_position;
    v_texcoord = a_texcoord;
    f_texture = a_texture;
  }
`;
const fragSrc = 
` #version 300 es

  precision highp float;
  precision highp int;
  precision highp sampler2DArray;
  
  uniform sampler2DArray diffuse;
  uniform int layer;
  
  in vec2 v_texcoord;
  in float f_texture;
   
  out vec4 outColor;

  void main() {
    outColor = texture(diffuse, vec3(v_texcoord, f_texture));
  }
`;

function WorldRenderer(chunks) {
  this.chunks = chunks;
  this.setup();
}

WorldRenderer.prototype.newChunk = function(chunk) {
  const gl = this.gl,
        renderer = this.renderer;
  chunk.vao = gl.createVertexArray();
  gl.bindVertexArray(chunk.vao);
  
  const positionBuffer = gl.createBuffer();
  renderer.assignAttrib('a_position', positionBuffer, 3, gl.FLOAT, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(chunk.mesh.positions), gl.DYNAMIC_DRAW);
  
  const texcoordBuffer = gl.createBuffer();
  renderer.assignAttrib('a_texcoord', texcoordBuffer, 2, gl.FLOAT, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(chunk.mesh.texcoords), gl.DYNAMIC_DRAW);
  
  const textureBuffer = gl.createBuffer();
  renderer.assignAttrib('a_texture', textureBuffer, 1, gl.INT, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Int32Array(chunk.mesh.textures), gl.DYNAMIC_DRAW);
  
  chunk.mesh.onUpdate = function() {
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(chunk.mesh.positions), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(chunk.mesh.texcoords), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Int32Array(chunk.mesh.textures), gl.DYNAMIC_DRAW);
  };
}

WorldRenderer.prototype.setup = function() {
  const renderer = this.renderer = new Renderer(document.getElementById('glcanvas'), vertSrc, fragSrc);
  const gl = this.gl = renderer.gl;
  const program = renderer.program;
  const canvas = this.canvas = renderer.canvas;
    
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  
  renderer.createTextureArray(['./images/dirt.png','./images/grass-side.png','./images/grass-top.png','./images/stone.png'], 16, 16);
  
  // uniforms
  const diffuseLocation = gl.getUniformLocation(program, 'diffuse');
  const layerLocation = gl.getUniformLocation(program, 'layer');
  
  gl.uniform1i(diffuseLocation, 0);
  gl.uniform1i(layerLocation, 3);
  
  // matrices
  const projectionLoc = gl.getUniformLocation(program, 'projection');
  const cameraLoc = gl.getUniformLocation(program, 'camera');
  const modelLoc = gl.getUniformLocation(program, 'model');
  
  const projectionMatrix = new mat4();
  
  // canvas resize
  function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    projectionMatrix.perspective(1, gl.canvas.width / gl.canvas.height, 0.1, 2000);
  }
  onResize();
  window.onresize = onResize;
  
  let camera = new Camera(-16, -16, -40, 0, 0, 0, canvas);
  
  // draw loop
  this.draw = function() {
    gl.clearColor(0, 0.5, 0.8, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    gl.useProgram(program);
    
    // matrices
    gl.uniformMatrix4fv(projectionLoc, false, projectionMatrix.data);
    
    const cameraMatrix = new mat4();
    cameraMatrix.rotateX(camera.rx);
    cameraMatrix.rotateY(camera.ry);
    cameraMatrix.translate(camera.x, camera.y, camera.z);
    gl.uniformMatrix4fv(cameraLoc, false, cameraMatrix.data);
    
    for (let i in this.chunks) {
      const chunk = this.chunks[i],
            modelMatrix = new mat4();
      modelMatrix.translate(chunk.x * 32, chunk.y * 32, chunk.z * 32);
      gl.uniformMatrix4fv(modelLoc, false, modelMatrix.data);
      gl.bindVertexArray(chunk.vao);

      gl.drawArrays(gl.TRIANGLES, 0, chunk.mesh.positions.length / 3);
    }
    
    camera.tick();
  };
};

