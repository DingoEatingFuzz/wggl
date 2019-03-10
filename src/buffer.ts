import { Texture } from './texture';

export enum TexturePointer {
  TEXTURE = "TEXTURE",
  TEXTURE_2D = "TEXTURE_2D",
  // TODO: Incomplete list
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Constants#Textures
}

export enum BufferAttachment {
  COLOR_ATTACHMENT0 = "COLOR_ATTACHMENT0",
  // TODO: Incomplete list
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Constants#Draw_buffers
}

export class Buffer {
  constructor(
    public gl:WebGLRenderingContext,
    public texture:Texture,
    public target:TexturePointer,
    public buffer:WebGLBuffer,
    public attachment:BufferAttachment,
    public level:number
  ) { }
}
