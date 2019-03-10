export enum GlType {
  attribute = 'attribute',
  uniform = 'uniform',
}

export interface GlLocatable {
  glType: GlType;
}

export enum PixelFormat {
  DEPTH_COMPONENT = "DEPTH_COMPONENT",
  ALPHA = "ALPHA",
  RGB = "RGB",
  RGBA = "RGBA",
  LUMINANCE = "LUMINANCE",
  LUMINANCE_ALPHA = "LUMINANCE_ALPHA",
}

export enum PixelType {
  UNSIGNED_BYTE = "UNSIGNED_BYTE",
  UNSIGNED_SHORT_4_4_4_4 = "UNSIGNED_SHORT_4_4_4_4",
  UNSIGNED_SHORT_5_5_5_1 = "UNSIGNED_SHORT_5_5_5_1",
  UNSIGNED_SHORT_5_6_5 = "UNSIGNED_SHORT_5_6_5",
}

export enum TextureFilter {
  NEAREST = "NEAREST",
  LINEAR = "LINEAR",
  // TODO: Break apart Min Filter and Mag Filter
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texParameter
}

export enum TextureWrap {
  REPEAT = "REPEAT",
  CLAMP_TO_EDGE = "CLAMP_TO_EDGE",
  MIRRORED_REPEAT = "MIRRORED_REPEAT",
}

export enum DrawModes {
  POINTS = "POINTS",
  LINES = "LINES",
  LINE_LOOP = "LINE_LOOP",
  LINE_STRIP = "LINE_STRIP",
  TRIANGLES = "TRIANGLES",
  TRIANGLE_STRIP = "TRIANGLE_STRIP",
  TRIANGLE_FAN = "TRIANGLE_FAN",
}
