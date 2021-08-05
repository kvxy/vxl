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
