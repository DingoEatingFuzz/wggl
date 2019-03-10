interface Shader {
  attrs: ShaderAttrs;
  src: string;
}

interface ShaderAttrs {
  [key: string]: any;
}

// Returns a function for binding attributes to a vertex shader
export function vs(strings: string | string[]): (attrs: ShaderAttrs) => Shader {
  if (typeof strings === 'string') strings = [strings];
  const src = `
    precision mediump float;

    ${strings.join('')}
  `;

  return attrs => {
    return {
      attrs,
      src
    };
  };
}

// Returns a function for binding attributes to a fragment shader
export function fs(strings: string | string[]): (attrs: ShaderAttrs) => Shader {
  if (typeof strings === 'string') strings = [strings];
  const src = `
    precision mediump float;

    ${strings.join('')}
  `;

  return attrs => {
    return {
      attrs,
      src
    };
  };
}

enum GlType {
  attribute = 'attribute',
  uniform = 'uniform',
}

interface GlLocatable {
  glType: GlType;
}

// Classes for storing state related to various buffer types before actually reading the buffers
class Attr implements GlLocatable {
  public glType:GlType = GlType.attribute;

  constructor(
    public size:number = 1,
    public stride:number = 0,
    public offset:number = 0,
    public normalize:boolean = false,
  ) { }
}

enum UniformType {
  float = "float",
  int = "int",
}

class Uniform  implements GlLocatable {
  public glType:GlType = GlType.uniform;

  constructor(
    public length:number = 1,
    public type:UniformType = UniformType.float,
  ) { }
}

enum PixelFormat {
  DEPTH_COMPONENT = "DEPTH_COMPONENT",
  ALPHA = "ALPHA",
  RGB = "RGB",
  RGBA = "RGBA",
  LUMINANCE = "LUMINANCE",
  LUMINANCE_ALPHA = "LUMINANCE_ALPHA",
}

enum PixelType {
  UNSIGNED_BYTE = "UNSIGNED_BYTE",
  UNSIGNED_SHORT_4_4_4_4 = "UNSIGNED_SHORT_4_4_4_4",
  UNSIGNED_SHORT_5_5_5_1 = "UNSIGNED_SHORT_5_5_5_1",
  UNSIGNED_SHORT_5_6_5 = "UNSIGNED_SHORT_5_6_5",
}

enum TextureFilter {
  NEAREST = "NEAREST",
  LINEAR = "LINEAR",
  // TODO: Break apart Min Filter and Mag Filter
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texParameter
}

enum TextureWrap {
  REPEAT = "REPEAT",
  CLAMP_TO_EDGE = "CLAMP_TO_EDGE",
  MIRRORED_REPEAT = "MIRRORED_REPEAT",
}

interface TextureOptions {
  format?: PixelFormat;
  type?: PixelType;
  wrap?: TextureWrap;
  filter?: TextureFilter;
}

class Texture {
  public format: PixelFormat = PixelFormat.RGBA;
  public type: PixelType = PixelType.UNSIGNED_BYTE;
  public wrap: TextureWrap = TextureWrap.CLAMP_TO_EDGE;
  public filter: TextureFilter = TextureFilter.NEAREST;
  public gl: WebGLRenderingContext;
  public texture: WebGLTexture;

  constructor(
    public canvas:HTMLCanvasElement,
    public width:number,
    public height:number,
    public pixels:WebGLTexture | ArrayBufferView = new Uint8Array(0),
    props: TextureOptions
  ) {
    if (props != null) {
      this.format = props.format || this.format;
      this.type = props.type || this.type;
      this.wrap = props.wrap || this.wrap;
      this.filter = props.filter || this.filter;
    }

    this.gl = canvas.getContext('webgl');

    if (!this.gl) {
      console.warn('No WebGL support');
      return;
    }

    this.texture = createTexture(this.gl, this.wrap, this.filter);
    this.from(this.pixels);
  }

  public from(newPixels:WebGLTexture | ArrayBufferView = new Uint8Array(0)): void {
    if (newPixels instanceof WebGLTexture) {
      this.texture = newPixels;
      return;
    }

    newPixels = this.pixels;

    const gl = this.gl;
    const format = gl[this.format];
    const type = gl[this.type];
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, format, this.width, this.height, 0, format, type, null);

    if (newPixels) {
      gl.texImage2D(gl.TEXTURE_2D, 0, format, this.width, this.height, 0, format, type, newPixels as ArrayBufferView);
    }
  };
}

enum TexturePointer {
  TEXTURE = "TEXTURE",
  TEXTURE_2D = "TEXTURE_2D",
  // TODO: Incomplete list
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Constants#Textures
}

enum BufferAttachment {
  COLOR_ATTACHMENT0 = "COLOR_ATTACHMENT0",
  // TODO: Incomplete list
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Constants#Draw_buffers
}

class Buffer {
  constructor(
    public gl:WebGLRenderingContext,
    public texture:Texture,
    public target:TexturePointer,
    public buffer:WebGLBuffer,
    public attachment:BufferAttachment,
    public level:number
  ) { }
}

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

// Bakes a vertex and fragment shader into a canvas and returns an object
// for operating with the resulting webgl program

interface WgglProgramShaders {
  [key: string]: [Shader, Shader];
}

enum DrawModes {
  POINTS = "POINTS",
  LINES = "LINES",
  LINE_LOOP = "LINE_LOOP",
  LINE_STRIP = "LINE_STRIP",
  TRIANGLES = "TRIANGLES",
  TRIANGLE_STRIP = "TRIANGLE_STRIP",
  TRIANGLE_FAN = "TRIANGLE_FAN",
}

class WgglProgram {
  public gl:WebGLRenderingContext;

  constructor(public canvas:HTMLCanvasElement, public bindPointers:AttrPointers, public program:WebGLProgram) {
    this.gl = canvas.getContext('webgl');
  };

  public draw(
    values:ShaderAttrs,
    drawMode:DrawModes = DrawModes.TRIANGLE_STRIP,
    offset:number = 0,
    size:number = 4,
    keepCurrentViewport:boolean = false
  ): void {
    const { canvas, gl } = this;
    let textureCounter = 0;

    if (!keepCurrentViewport) gl.useProgram(this.program);

    // Pass values to the GPU
    Object.keys(values).forEach(key => {
      const value = values[key];
      const attr = this.bindPointers[key];

      switch (attr.parameters.glType) {
        case GlType.attribute:
          gl.enableVertexAttribArray(attr.location as number);
          gl.bindBuffer(gl.ARRAY_BUFFER, attr.buffer);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(value), gl.STATIC_DRAW);

          const { size, normalize, stride, offset } = attr.parameters;
          gl.vertexAttribPointer(attr.location as number, size, gl.FLOAT, normalize, stride, offset);
          break;

        case GlType.uniform:
          // TODO: Could be simplified by making the UniformType valies the single characters
          const typeModifier = attr.parameters.type === UniformType.float ? 'f' : 'i';
          if (isAnyArray(value)) {
            if (value.length > 4) {
              throw new Error('Value of uniform type has more than the maximum four dimensions');
            }
            // Dynamic GL method name, (e.g., gl.uniform4fv)
            gl[`uniform${value.length}${typeModifier}v`](attr.location, value);
          } else if(value instanceof WebGLTexture && gl.isTexture(value)) {
            // bind texture
            gl.activeTexture(gl.TEXTURE0 + textureCounter);
            gl.bindTexture(gl.TEXTURE_2D, value);
            gl.uniform1i(attr.location, textureCounter);
            textureCounter++;
          } else if (typeof value !== 'number' && typeof value !== 'boolean') {
            throw new Error('Value of uniform type must be a number, boolean, or array');
          } else {
            gl[`uniform1${typeModifier}`](attr.location, value);
          }
          break;
      }
    });

    // Draw
    if (!keepCurrentViewport) {
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    gl.drawArrays(gl[drawMode], offset, size);
  };

  public drawTo(
    buffer:Buffer,
    values:AttrPointers,
    drawMode:DrawModes = DrawModes.TRIANGLE_STRIP,
    offset:number = 0,
    size:number = 4
  ): void {
    const gl = this.gl;
    const texture = buffer.texture;

    // Use the provided program to draw to the provided buffer
    gl.useProgram(this.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer.buffer);
    gl.viewport(0, 0, texture.width, texture.height);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl[buffer.attachment],
      gl[buffer.target],
      texture.texture,
      gl[buffer.level]
    );

    this.draw(values, drawMode, offset, size, true);

    // Reset the draw buffer to the screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };
}

interface AttrPointer {
  location: WebGLUniformLocation | number;
  parameters: any;
  buffer: WebGLBuffer;
}

interface AttrPointers {
  [key: string]: AttrPointer;
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

function isAnyArray(arr:any): boolean {
  if (arr == null) return false;

  // True when arr is any of the typed arrays or the basic array
  return /^(Float(32|64)|Int(8|16|32)|Uint(8(Clamped)?|16|32|))?Array$/.test(arr.constructor.name);
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

function createTexture(gl:WebGLRenderingContext, wrap:TextureWrap, filter:TextureFilter): WebGLTexture {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl[wrap]);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl[wrap]);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[filter]);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[filter]);

  return texture;
}

export const QUAD2 = [
  -1, -1,
  1, -1,
  -1, 1,
  1, 1
];
