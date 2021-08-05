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