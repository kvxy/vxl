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