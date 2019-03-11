import {
  PixelFormat,
  PixelType,
  TextureWrap,
  TextureFilter
} from "./primitives";

export interface TextureOptions {
  format?: PixelFormat;
  type?: PixelType;
  wrap?: TextureWrap;
  filter?: TextureFilter;
}

export class Texture {
  public format: PixelFormat = PixelFormat.RGBA;
  public type: PixelType = PixelType.UNSIGNED_BYTE;
  public wrap: TextureWrap = TextureWrap.CLAMP_TO_EDGE;
  public filter: TextureFilter = TextureFilter.NEAREST;
  public gl: WebGLRenderingContext;
  public texture?: WebGLTexture;

  constructor(
    public canvas: HTMLCanvasElement,
    public width: number,
    public height: number,
    public pixels: WebGLTexture | ArrayBufferView = new Uint8Array(0),
    props: TextureOptions
  ) {
    if (props != null) {
      this.format = props.format || this.format;
      this.type = props.type || this.type;
      this.wrap = props.wrap || this.wrap;
      this.filter = props.filter || this.filter;
    }

    this.gl = canvas.getContext("webgl") as WebGLRenderingContext;

    if (!this.gl) {
      console.warn("No WebGL support");
      return;
    }

    this.texture = createTexture(this.gl, this.wrap, this.filter);
    this.from(this.pixels);
  }

  public from(
    newPixels: WebGLTexture | ArrayBufferView = new Uint8Array(0)
  ): void {
    if (newPixels instanceof WebGLTexture) {
      this.texture = newPixels;
      return;
    }

    newPixels = this.pixels;

    const gl = this.gl;
    const format = gl[this.format];
    const type = gl[this.type];
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.bindTexture(gl.TEXTURE_2D, this.texture as WebGLTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      format,
      this.width,
      this.height,
      0,
      format,
      type,
      null
    );

    if (newPixels) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        format,
        this.width,
        this.height,
        0,
        format,
        type,
        newPixels as ArrayBufferView
      );
    }
  }
}

function createTexture(
  gl: WebGLRenderingContext,
  wrap: TextureWrap,
  filter: TextureFilter
): WebGLTexture {
  let texture = gl.createTexture() as WebGLTexture;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl[wrap]);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl[wrap]);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[filter]);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[filter]);

  return texture;
}
