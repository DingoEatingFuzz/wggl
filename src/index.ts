import { Shader, ShaderAttrs } from './shader';
import { Attr } from './attr';
import { Uniform, UniformType } from './uniform';
import { Texture, TextureOptions } from './texture';
import { Buffer, TexturePointer, BufferAttachment } from './buffer';
import { Wggl } from './wggl';

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

// Convenience function for constructing a Wggl instance
export default (canvas:HTMLCanvasElement, vertShader:Shader, fragShader:Shader) => {
  return new Wggl(canvas, vertShader, fragShader);
}

export const QUAD2 = [
  -1, -1,
  1, -1,
  -1, 1,
  1, 1
];

export { vs, fs } from './shader';
