import { Shader, ShaderAttrs } from './shader';
import { Attr } from './attr';
import { Uniform, UniformType } from './uniform';
import { GlType, GlLocatable } from './primitives';
import { Texture, TextureOptions } from './texture';
import { Buffer, TexturePointer, BufferAttachment } from './buffer';
import { WgglProgram, WgglProgramShaders, AttrPointers } from './program';

// Convenience function for creating attrs
export function attr(size: number = 1, stride: number = 0, offset: number = 0, normalize: boolean = false): Attr {
  return new Attr(size, stride, offset, normalize);
}

// Convenience function for creating uniforms
export function uniform(length: number = 1, type: UniformType = UniformType.float): Uniform {
  return new Uniform(length, type);
}

// Creates a partially applied Texture factory
export function texture(width: number, height: number, pixels:WebGLTexture | ArrayBufferView, props:TextureOptions): (HTMLCanvasElement) => Texture {
  return canvas => new Texture(canvas, width, height, pixels, props);
}

// Creates a partially applied Buffer factory
export function buffer(canvas: HTMLCanvasElement, attachment:BufferAttachment = BufferAttachment.COLOR_ATTACHMENT0, level:number = 0): (WebGLTexture, TexturePointer, BufferAttachment?, number?) => Buffer {
  const gl = canvas.getContext('webgl');

  if (!gl) {
    console.warn('No WebGL support');
    return;
  }

  const buffer = gl.createFramebuffer();

  return (texture:Texture, target: TexturePointer = TexturePointer.TEXTURE_2D, customAttachment?:BufferAttachment, customLevel?:number) =>
    new Buffer(gl, texture, target, buffer, customAttachment || attachment, customLevel || level);
}

class Wggl {
  public canvas: HTMLCanvasElement;
  public gl: WebGLRenderingContext;

  // Programs become dynamic properties on the Wggl instance, this just prevents
  // unwanted types from becoming properties.
  [key: string]: HTMLCanvasElement | WebGLRenderingContext | WgglProgram | Function;

  constructor(canvas: HTMLCanvasElement, vertShader:Shader, fragShader:Shader);
  constructor(canvas: HTMLCanvasElement, vertShader:any, fragShader?:Shader) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl');

    let programs: WgglProgramShaders;
    if (vertShader && fragShader) {
      programs = { default: [ vertShader, fragShader ] }
    } else {
      programs = vertShader;
    }

    // do things with programs
    this.setupPrograms(programs);

    this.reset();

    // If there is a default program, "hoist" its methods to the Wggl instance
    // wggl.default.draw() ==> wggl.draw();
    // wggl.default.drawTo() ==> wggl.drawTo();
    if (this.default) {
      const defaultProgram = this.default as WgglProgram;
      this.draw = defaultProgram.draw.bind(this.default);
      this.drawTo = defaultProgram.drawTo.bind(this.default);
    }
  };

  setupPrograms(programs:WgglProgramShaders): void {
    Object.keys(programs).forEach(programName => {
      const [vShader, fShader] = programs[programName];
      const gl = this.gl;

      if (this[programName] != null) {
        console.warn(`Skipping program ${programName}. It is either a duplicate program or uses a reserved name`);
      }

      const bindPointers:AttrPointers = {};
      const vs = createShader(gl, gl.VERTEX_SHADER, vShader.src);
      const fs = createShader(gl, gl.FRAGMENT_SHADER, fShader.src);
      let program = createProgram(gl, vs, fs);

      mergeAttrs(gl, program, bindPointers, vShader.attrs);
      mergeAttrs(gl, program, bindPointers, fShader.attrs);

      Object.keys(bindPointers).forEach(key => {
        const value = bindPointers[key];
        if (value.parameters.glType === GlType.attribute) {
          value.buffer = gl.createBuffer();
        }
      });

      this[programName] = new WgglProgram(this.canvas, bindPointers, program);
    })
  }

  public reset(): void {
    const { gl, canvas } = this;
    const scale = Math.min(window.devicePixelRatio, 2);
    canvas.width = Math.floor(canvas.clientWidth * scale);
    canvas.height = Math.floor(canvas.clientHeight * scale);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
}

// Convenience function for constructing a Wggl instance
export default (canvas:HTMLCanvasElement, vertShader:Shader, fragShader:Shader) => {
  return new Wggl(canvas, vertShader, fragShader);
}

function mergeAttrs(gl:WebGLRenderingContext, program:WebGLProgram, source:AttrPointers, attrs:ShaderAttrs): void {
  Object.keys(attrs).forEach(attr => {
    if (source[attr] != null) {
      console.warn(`Attribute ${attr} is being bound multiple times. Variable names should be unique across shaders and primitives`);
    }
    source[attr] = {
      location: locationForAttr(gl, program, attr, attrs[attr]),
      parameters: attrs[attr],
      buffer: null,
    };
  });
}

function locationForAttr(gl:WebGLRenderingContext, program:WebGLProgram, key:string, value:GlLocatable): WebGLUniformLocation | number {
  switch (value.glType) {
    case GlType.attribute:
      return gl.getAttribLocation(program, key);
    case GlType.uniform:
      return gl.getUniformLocation(program, key);
  }
}

function createShader(gl:WebGLRenderingContext, type:number, source:string): WebGLShader {
  let shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const isCompiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

  if (!isCompiled) {
    const err = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader);
    throw new Error(err);
  }

  return shader;
}

function createProgram(gl:WebGLRenderingContext, vertexShader:WebGLShader, fragmentShader:WebGLShader): WebGLProgram {
  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const isLinked = gl.getProgramParameter(program, gl.LINK_STATUS);

  if (!isLinked) {
    const err = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(err);
  }

  return program;
}

export const QUAD2 = [
  -1, -1,
  1, -1,
  -1, 1,
  1, 1
];

export { vs, fs } from './shader';
