import { Shader, ShaderAttrs } from "./shader";
import { UniformType } from "./uniform";
import { Buffer } from "./buffer";
import { GlType, DrawModes } from "./primitives";

export interface WgglProgramShaders {
  [key: string]: [Shader, Shader];
}

export interface AttrPointer {
  location: WebGLUniformLocation | number;
  parameters: any;
  buffer: WebGLBuffer;
}

export interface AttrPointers {
  [key: string]: AttrPointer;
}

// Bakes a vertex and fragment shader into a canvas and returns an object
// for operating with the resulting webgl program
export class WgglProgram {
  public gl: WebGLRenderingContext;

  constructor(
    public canvas: HTMLCanvasElement,
    public bindPointers: AttrPointers,
    public program: WebGLProgram
  ) {
    this.gl = canvas.getContext("webgl");
  }

  public draw(
    values: ShaderAttrs,
    drawMode: DrawModes = DrawModes.TRIANGLE_STRIP,
    offset: number = 0,
    size: number = 4,
    keepCurrentViewport: boolean = false
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
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(value),
            gl.STATIC_DRAW
          );

          const { size, normalize, stride, offset } = attr.parameters;
          gl.vertexAttribPointer(
            attr.location as number,
            size,
            gl.FLOAT,
            normalize,
            stride,
            offset
          );
          break;

        case GlType.uniform:
          // TODO: Could be simplified by making the UniformType valies the single characters
          const typeModifier =
            attr.parameters.type === UniformType.float ? "f" : "i";
          if (isAnyArray(value)) {
            if (value.length > 4) {
              throw new Error(
                "Value of uniform type has more than the maximum four dimensions"
              );
            }
            // Dynamic GL method name, (e.g., gl.uniform4fv)
            gl[`uniform${value.length}${typeModifier}v`](attr.location, value);
          } else if (value instanceof WebGLTexture && gl.isTexture(value)) {
            // bind texture
            gl.activeTexture(gl.TEXTURE0 + textureCounter);
            gl.bindTexture(gl.TEXTURE_2D, value);
            gl.uniform1i(attr.location, textureCounter);
            textureCounter++;
          } else if (typeof value !== "number" && typeof value !== "boolean") {
            throw new Error(
              "Value of uniform type must be a number, boolean, or array"
            );
          } else {
            gl[`uniform1${typeModifier}`](attr.location, value);
          }
          break;
      }
    });

    // Draw
    if (!keepCurrentViewport) {
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    gl.drawArrays(gl[drawMode], offset, size);
  }

  public drawTo(
    buffer: Buffer,
    values: AttrPointers,
    drawMode: DrawModes = DrawModes.TRIANGLE_STRIP,
    offset: number = 0,
    size: number = 4
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
  }
}

function isAnyArray(arr: any): boolean {
  if (arr == null) return false;

  // True when arr is any of the typed arrays or the basic array
  return /^(Float(32|64)|Int(8|16|32)|Uint(8(Clamped)?|16|32|))?Array$/.test(
    arr.constructor.name
  );
}
