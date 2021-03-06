import { default as wggl, fs, vs, attr, uniform, QUAD2 } from '../../src/wggl';
import paintSrc from './paint';

const vert = vs`
  attribute vec2 quad;

  void main() {
    gl_Position = vec4(quad, 0, 1.0);
  }
`
const paint = fs(paintSrc);

document.addEventListener("DOMContentLoaded", function() {
  const canvas = document.querySelector('canvas');

  let step = Math.PI / 200;
  let ratio = 5;
  let seed = Math.random() * 50;

  const program = wggl(canvas,
    vert({ quad: attr(2) }),
    paint({
      scale: uniform(),
      ratio: uniform(),
      showLines: uniform(),
      seed: uniform(),
    })
  )

  requestAnimationFrame(function tick() {
    program.draw({
      ratio,
      seed,
      quad: QUAD2,
      scale: [ canvas.width, canvas.height ],
      showLines: ratio > 5,
    })

    step += Math.PI / 200;
    ratio = Math.sin(step % (Math.PI * 2)) * 40 + 50
    requestAnimationFrame(tick)
  })
})
