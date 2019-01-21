import { default as wggl, fs, vs, attr, uniform, texture, buffer, QUAD2 } from '../../src/wggl';
import rainbowSrc from './rainbow';

const { assign } = Object;

const ARROW_UP = 38;
const ARROW_DOWN = 40;
const SPACE = 32;

const vert = vs`
  attribute vec2 quad;

  void main() {
    gl_Position = vec4(quad, 0, 1.0);
  }
`

const gol = fs`
  uniform sampler2D state;
  uniform vec2 scale;

  int get(vec2 offset) {
    return int(texture2D(state, (gl_FragCoord.xy + offset) / scale).r);
  }

  void main() {
    int sum =
      get(vec2(-1.0, -1.0)) +
      get(vec2(-1.0, 0.0)) +
      get(vec2(-1.0, 1.0)) +
      get(vec2(0.0, -1.0)) +
      get(vec2(0.0, 1.0)) +
      get(vec2(1.0, -1.0)) +
      get(vec2(1.0, 0.0)) +
      get(vec2(1.0, 1.0));
    if (sum == 3) {
      gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    } else if (sum == 2) {
      float current = float(get(vec2(0.0, 0.0)));
      gl_FragColor = vec4(current, current, current, 1.0);
    } else {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
  }
`

const copy = fs`
  uniform sampler2D state;
  uniform vec2 scale;

  void main() {
    gl_FragColor = texture2D(state, gl_FragCoord.xy / scale);
  }
`;

const rainbow = fs(rainbowSrc);

const randomBoard = (width, height) => {
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0, len = width * height; i < len; i++) {
    // Set all three color channels to either black or white
    let idx = i * 4;
    // Always set alpha to full
    rgba[idx] = rgba[idx + 1] = rgba[idx + 2] = Math.random() > 0.9 ? 255 : 0;
    rgba[idx + 3] = 255;
  }
  return rgba;
}

document.addEventListener("DOMContentLoaded", function() {
  let seed = Math.random() * 50;
  const canvas = document.querySelector('canvas');
  const cScale = Math.min(window.devicePixelRatio, 2);
  canvas.width = Math.floor(canvas.clientWidth * cScale);
  canvas.height = Math.floor(canvas.clientHeight * cScale);
  console.log(canvas.width, canvas.height);

  let stateBuffer = buffer(canvas);
  let multiPass = buffer(canvas);
  let mp = texture(canvas.width, canvas.height, randomBoard(canvas.width, canvas.height))(canvas);

  let scale = 1;
  let { w, h, current, next, program } = makeGOLProgram(canvas, scale);

  requestAnimationFrame(function tick() {
    const args = {
      quad: QUAD2,
      state: current.texture,
    };

    // TODO: think more about how to handle multipass rendering
    program.gol.drawTo(stateBuffer(next), assign({ scale: [w, h] }, args));
    program.display.drawTo(multiPass(mp), assign({ scale: [canvas.width, canvas.height] }, args));
    program.rainbow.draw({ quad: QUAD2, state: mp.texture, seed, scale: [canvas.width, canvas.height] });

    // TODO: think more about how to handle "double buffers"
    let tmp = current.texture;
    current.from(next.texture);
    next.from(tmp);

    requestAnimationFrame(tick)
  })

  document.addEventListener("mouseup", function() {
    current.from(randomBoard(w, h));
  });

  document.addEventListener("keyup", function({ keyCode }) {
    console.log(keyCode);
    if (keyCode === ARROW_UP) {
      scale = Math.min(50, scale + 1);
      ({ w, h, current, next, program } = makeGOLProgram(canvas, scale));
    }
    if (keyCode === ARROW_DOWN) {
      scale = Math.max(1, scale - 1);
      ({ w, h, current, next, program } = makeGOLProgram(canvas, scale));
    }
    if (keyCode === SPACE) {
      seed = Math.random() * 50;
    }
  })
})

function makeGOLProgram(canvas, scale) {
  const w = Math.floor(canvas.width / scale);
  const h = Math.floor(canvas.height / scale);

  let current = texture(w, h, randomBoard(w, h), { filter: 'NEAREST' })(canvas);
  let next = texture(w, h)(canvas);

  const program = wggl(canvas, {
    gol: [
      vert({ quad: attr(2) }),
      gol({ scale: uniform(), state: uniform() })
    ],
    display: [
      vert({ quad: attr(2) }),
      copy({ scale: uniform(), state: uniform() })
    ],
    rainbow: [
      vert({ quad: attr(2) }),
      rainbow({ seed: uniform(), state: uniform(), scale: uniform() }),
    ],
  })

  return { w, h, current, next, program };
}
