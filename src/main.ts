import {vec2, vec3, mat4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import Particle from './Particle';
import { isUndefined } from 'util';


// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  //tesselations: 5,
  'Load Scene': loadScene, // A function pointer, essentially
  Mesh : 'none',
  CameraMove : true,
  Autoplay : false,
};

let square: Square;
let time: number = 0.0;
let n: number = 150.0;
let particles = new Array<Particle>();
let isUpdate = true;
let colorsArray : Array<number> = [];

// used to store mesh vertices position
let vertices : Array<Array<number>> = new Array<Array<number>>();
let indices : Array<Array<vec3>> = new Array<Array<vec3>>();

const camera = new Camera(vec3.fromValues(0, 100, 100), vec3.fromValues(0, 0, 0));
let mousePos = vec3.create();
let mouseDown = false;
let mouseMode = 0;
let rotationSpeed = 0.0;
let translationSpeed = 0.0;
let zoomSpeed = 0.0;
let isUpdateCamera = true;
let isAuto = false;
let playTime = 0.0;
let currentMesh = 0;


// read text file function
// reference: https://stackoverflow.com/questions/14446447/how-to-read-a-local-text-file
function readTextFile(file : string) : string
{
  var allText : string;
    var rawFile = new XMLHttpRequest();
    rawFile.open("GET", file, false);
    rawFile.onreadystatechange = function ()
    {
        if(rawFile.readyState === 4)
        {
            if(rawFile.status === 200 || rawFile.status == 0)
            {
                allText = rawFile.responseText;
                return allText;
            }
        }
    }
    rawFile.send(null);
    return allText;
}

function loadScene() {
  square = new Square();
  square.create();

  rotationSpeed = camera.controls.rotateSpeed;
  translationSpeed = camera.controls.translateSpeed;
  zoomSpeed = camera.controls.zoomSpeed;

  // mesh none
  vertices[0] = new Array<number>();
  for(let i = 0; i < n; i++) {
    for(let j = 0; j < n; j++) {
      vertices[0].push((Math.random() - 0.5) * 200.0);
      vertices[0].push((Math.random() - 0.5) * 200.0);
      vertices[0].push((Math.random() - 0.5) * 200.0);
    }
  }

  // mesh bird
  var OBJ = require('webgl-obj-loader');
  var meshPathB = './obj/chick2.obj';
  var dataB = readTextFile(meshPathB);
  var meshB = new OBJ.Mesh(dataB);
  vertices.push(meshB.vertices);

  var meshPathC = './obj/pumpkin.obj';
  var dataC = readTextFile(meshPathC);
  var meshC = new OBJ.Mesh(dataC);
  vertices.push(meshC.vertices);
  

  //indices none
  indices.push(new Array<vec3>());
  for(let i = 0; i < n; i++) {
    for(let j = 0; j < n; j++) {
      let pos = vec3.fromValues(vertices[0][3 * i * n + 3 * j],
        vertices[0][3 * n * i + 3 * j + 1],
        vertices[0][3 * n * i + 3 * j + 2]);
      indices[0].push(pos);
    }
  }

  //indices bird
  indices.push(new Array<vec3>());
  let len = vertices[1].length / 3;

  for(let i = 0; i < n; i++) {
    for(let j = 0; j < n; j++) {
      let idx = Math.floor(Math.random() * len);
        idx = Math.min(idx, len - 1);
        let pos = vec3.fromValues(vertices[1][3 * idx],
          vertices[1][3 * idx + 1],
          vertices[1][3 * idx + 2]);
      indices[1].push(pos);
    }
  }

  //indices pumpkin
  indices.push(new Array<vec3>());
  len = vertices[2].length / 3;
  for(let i = 0; i < n; i++) {
    for(let j = 0; j < n; j++) {
      let idx = Math.floor(Math.random() * len);
        idx = Math.min(idx, len - 1);
        let pos = vec3.fromValues(vertices[2][3 * idx],
          vertices[2][3 * idx + 1],
          vertices[2][3 * idx + 2]);
      indices[2].push(pos);
    }
  }


  // enable key event
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;

  // Set up particles here. Hard-coded example data for now
  let offsetsArray = [];

  len = vertices[0].length / 3;
  for(let i = 0; i < n; i++) {
    for(let j = 0; j < n; j++) {
      let pos = vec3.fromValues(vertices[0][3 * i * n + 3 * j],
                                vertices[0][3 * i * n + 3 * j + 1],
                                vertices[0][3 * i * n + 3 * j + 2]);
      // let pos = vec3.fromValues(indices[1][i * n + j][0],
      //   indices[1][i * n + j][1],indices[1][i * n + j][2]);
      particles.push(new Particle(vec3.fromValues(0, 0, 0), vec3.fromValues(0, 0, 0), vec3.fromValues(0, 0, 0), 1.0, time, pos));

      offsetsArray.push(0.0);
      offsetsArray.push(0.0);
      offsetsArray.push(0.0);

      colorsArray.push(i / n);
      colorsArray.push(j / n);
      colorsArray.push(1.0);
      colorsArray.push(1.0); // Alpha channel
    }
  }

  let offsets: Float32Array = new Float32Array(offsetsArray);
  let colors: Float32Array = new Float32Array(colorsArray);
  square.setInstanceVBOs(offsets, colors);
  square.setNumInstances(n * n); // 10x10 grid of "particles"
}



function handleKeyDown(event : any) {
  isUpdate = true;
}

function handleKeyUp(event : any) {
  isUpdate = false;
}

function raycast(x : number, y :number) : vec3{
  let p = vec3.fromValues(x  , y , 1.0 );

  // p = viewMat-1 * projMat-1 * ((px, py, 1, 1) * farclip)
  p = vec3.transformMat4(p, p, mat4.invert(mat4.create(), camera.projectionMatrix));
  p = vec3.transformMat4(p, p, mat4.invert(mat4.create(), camera.viewMatrix));


  let dir = vec3.sub(vec3.create(), p, camera.position);
  let len = vec3.len(dir);
  let t = (camera.position[2]) / camera.far; 

  p = vec3.add(p, camera.position, vec3.scale(vec3.create(), dir, t));

  return p;

}


function mouseClick(event :  MouseEvent) {
  if(isUpdateCamera === false) {
    console.log("mouse event");
    let pos : vec3 = raycast(event.clientX / window.innerWidth * 2 - 1,
                            - event.clientY / window.innerHeight * 2 + 1);
    if(event.button === 0) {
      //attract
      mouseMode = 0;
      mousePos = pos;
      mouseDown = true;
    } else if(event.button === 2) {
      //repel
      mouseMode = 1;
      mousePos = pos;
      mouseDown = true;
    }
  }
}

function mouseUp(event : MouseEvent) {
  if(isUpdateCamera === false) {
    mouseDown = false;
    mouseMode = 0;
    for(let i = 0; i < n; i++) {
      for(let j = 0; j < n; j++) {
        particles[i * n + j].velocity = vec3.fromValues(0, 0, 0);
      }
    }
  }
}

function updateMesh(m : number) {

  for(let i = 0; i < n; i++) {
    for(let j = 0; j < n; j++) {
      particles[i * n + j].forceP = vec3.fromValues(indices[m][i * n + j][0],indices[m][i * n + j][1],indices[m][i * n + j][2]);
      particles[i * n + j].velocity = vec3.fromValues(0, 0, 0);
    }
  }
  
}

function updateParticle(time : number, mode :number, forceP : vec3, mouse :boolean) {

  // Set up particles here. Hard-coded example data for now
  let offsetsArray = [];


  for(let i = 0; i < n; i++) {
    for(let j = 0; j < n; j++) {

      if(mouse === true && isUpdateCamera === false) {
        particles[i * n + j].update(time, forceP, mode);
      } else {
        particles[i * n + j].update(time, particles[i * n + j].forceP, mode);
      }
      

      let pos : vec3= particles[n * i + j].position;

      offsetsArray.push(pos[0]);
      offsetsArray.push(pos[1]);
      offsetsArray.push(pos[2]);
    }
  }
  let offsets: Float32Array = new Float32Array(offsetsArray);
  let colors: Float32Array = new Float32Array(colorsArray);
  square.setInstanceVBOs(offsets, colors);
  square.setNumInstances(n * n);
  
}


function autoPlay(t : number) {
  let timeGap = time - t;
  // timeGap = timeGap % 120.0;
  mouseDown = true;
  mousePos = vec3.fromValues(20.0 * Math.sin(timeGap / 60.0), 5 * Math.sin(timeGap / 10.0), 20.0 * Math.cos(timeGap / 60.0))
  vec3.add(mousePos, mousePos, vec3.fromValues(Math.random() * 10.0 - 5.0, Math.random() * 10.0 - 5.0, Math.random() * 10.0 - 5.0));
  mouseMode = 0;
  updateParticle(time, mouseMode, mousePos, mouseDown);
}

function loadMusic() {
  var audio = document.createElement("audio");
  audio.src = "./music/m1.mp3";
  audio.setAttribute('loop', "loop");
  audio.play();
}


function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();
  gui.add(controls, 'CameraMove').onChange(function() {
    if(controls.CameraMove === false) {
      camera.controls.rotateSpeed = 0.0;
      camera.controls.translateSpeed = 0.0;
      camera.controls.zoomSpeed = 0.0;
      isUpdateCamera = false;
    } else {
      isUpdateCamera = true;
      camera.controls.rotateSpeed = rotationSpeed;
      camera.controls.translateSpeed = translationSpeed;
      camera.controls.zoomSpeed = zoomSpeed;
    }
  });
  gui.add(controls, 'Mesh', ['none', 'bird', 'pumpkin']).onChange(function() {
    if(controls.Mesh === 'none') {
      currentMesh = 0;
      updateMesh(0);
    } else if(controls.Mesh === 'bird') {
      currentMesh = 1;
      updateMesh(1);
    } else if(controls.Mesh === 'pumpkin') {
      currentMesh = 2;
      updateMesh(2);
    }
  });
  gui.add(controls, 'Autoplay').onChange(function() {
    if(controls.Autoplay === false) {
      camera.controls.rotateSpeed = rotationSpeed;
      camera.controls.translateSpeed = translationSpeed;
      camera.controls.zoomSpeed = zoomSpeed;
      isUpdateCamera = true;
      isAuto = false;
      updateMesh(currentMesh);
    } else {
      camera.controls.rotateSpeed = 0.0;
      camera.controls.translateSpeed = 0.0;
      camera.controls.zoomSpeed = 0.0;
      isUpdateCamera = false;
      isAuto = true;
      playTime = time;
      mouseDown = false;
    }
  });

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);


  // Initial call to load scene
  loadScene();
  loadMusic();

  canvas.addEventListener("mousedown", mouseClick, true);
  canvas.addEventListener("mouseup", mouseUp, true);
  

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0, 0, 0, 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // Additive blending

  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/particle-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/particle-frag.glsl')),
  ]);

  
  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();
    lambert.setTime(time++);
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    renderer.render(camera, lambert, [
      square,
    ]);

    if(!isAuto) {
      updateParticle(time, mouseMode, mousePos, mouseDown);
    }
    if(isAuto) {
      autoPlay(playTime);
    }
    
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}

main();
