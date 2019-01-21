// Returns a function for binding attributes to a vertex shader
export const vs = strings => {
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
};

// Returns a function for binding attributes to a fragment shader
export const fs = strings => {
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
};

// Bundles attribute related properties for using when reading attribute buffers
export const attr = (size = 1, stride = 0, offset = 0, normalize = false) => ({
  size, normalize, stride, offset, glType: 'attribute',
});

export const uniform = (length = 1, type = 'float') => ({
  length, type, glType: 'uniform',
});

export const texture = (width, height, pixels = null, props) => {
  const { format, wrap, filter, type } = Object.assign({
    format: 'RGBA',
    wrap: 'CLAMP_TO_EDGE',
    filter: 'NEAREST',
    type: 'UNSIGNED_BYTE'
  }, props);

  return canvas => {
    const gl = canvas.getContext('webgl');

    if (!gl) {
      console.warn('No WebGL support');
      return;
    }

    const texture = {
      gl,
      pixels,
      width,
      height,
      format: gl[format],
      wrap: gl[wrap],
      filter: gl[filter],
      type: gl[type],
      texture: createTexture(gl, gl[wrap], gl[filter]),

      from(pixels = null) {
        if (pixels instanceof WebGLTexture) {
          this.texture = pixels;
          return;
        }

        if (!isAnyArray(pixels)) pixels = texture.pixels;

        const gl = this.gl;
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.width, this.height, 0, this.format, this.type, null);
        if (pixels) {
          gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.width, this.height, 0, this.format, this.type, pixels);
        }
      },
    };

    texture.from(pixels);
    return texture;
  };
};

export const buffer = (canvas, attachment = 'COLOR_ATTACHMENT0', level = 0) => {
  const gl = canvas.getContext('webgl');

  if (!gl) {
    console.warn('No WebGL support');
    return;
  }

  const buffer = gl.createFramebuffer();

  return (texture, target = 'TEXTURE_2D', customAttachment, customLevel) => ({
    gl,
    texture,
    target,
    buffer,
    attachment: customAttachment || attachment,
    level: customLevel || level,
  });
};

// Bakes a vertex and fragment shader into a canvas and returns an object
// for operating with the resulting webgl program
export default (canvas, vertShader, fragShader) => {
  const gl = canvas.getContext('webgl');
  let programs = {};

  // TODO: replace gross duck-typing with something less squishy
  if (!vertShader.src || !vertShader.attrs) {
    programs = vertShader;
  } else {
    programs = { default: [ vertShader, fragShader ] };
  }

  if (!gl) {
    console.warn('No WebGL support');
    return;
  }

  const instance = {
    canvas,
    gl,
    reset() {
      const { gl, canvas } = this;
      const scale = Math.min(window.devicePixelRatio, 2);
      canvas.width = Math.floor(canvas.clientWidth * scale);
      canvas.height = Math.floor(canvas.clientHeight * scale);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
  };

  Object.entries(programs).forEach(([ programName, [vShader, fShader] ]) => {
    if (instance[programName] != null) {
      console.warn(`Skipping program ${programName}. It is either a duplicate program or uses a reserved name.`);
    }

    const bindPointers = {};
    const vs = createShader(gl, gl.VERTEX_SHADER, vShader.src);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fShader.src);
    let program = createProgram(gl, vs, fs);

    // Store the gl location (pointer) of each attribute provided to the vert and frag shaders
    // along with the read parameters of each attribute
    mergeAttrs(gl, program, bindPointers, vShader.attrs);
    mergeAttrs(gl, program, bindPointers, fShader.attrs);

    Object.entries(bindPointers).forEach(([key, value]) => {
      if (value.parameters.glType === 'attribute') {
        const buffer = gl.createBuffer();
        value.buffer = buffer;
      }
    });

    const wgglProgram = {
      canvas,
      gl,
      bindPointers,
      program,
      draw(values, drawMode = 'TRIANGLE_STRIP', offset = 0, size = 4, keepCurrentViewport = false) {
        const gl = this.gl;
        let textureCounter = 0;

        if(!keepCurrentViewport) gl.useProgram(this.program);

        Object.entries(values).forEach(([key, value]) => {
          const attr = this.bindPointers[key];
          switch (attr.parameters.glType) {
            case 'attribute':
              gl.enableVertexAttribArray(attr.location);
              gl.bindBuffer(gl.ARRAY_BUFFER, attr.buffer);
              gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(value), gl.STATIC_DRAW);

              const { size, normalize, stride, offset } = attr.parameters;
              gl.vertexAttribPointer(attr.location, size, gl.FLOAT, normalize, stride, offset);
              break;
            case 'uniform':
              const typeModifier = attr.parameters.type === 'float' ? 'f' : 'i';
              if (isAnyArray(value)) {
                if (value.length > 4) {
                  throw new Error('Value of uniform type has more than the maximum four dimensions');
                }
                gl[`uniform${value.length}${typeModifier}v`](attr.location, value);
              } else if (value instanceof WebGLTexture && gl.isTexture(value)) {
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

        // Draw the things
        if (!keepCurrentViewport) {
          gl.viewport(0, 0, canvas.width, canvas.height);
        }
        gl.drawArrays(gl[drawMode], offset, size);
      },
      drawTo(buffer, values, drawMode = 'TRIANGLE_STRIP', offset = 0, size = 4) {
        const gl = this.gl;
        const texture = buffer.texture;
        gl.useProgram(this.program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, buffer.buffer);
        gl.viewport(0, 0, texture.width, texture.height);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl[buffer.attachment], gl[buffer.target], texture.texture, gl[buffer.level]);
        this.draw(values, drawMode, offset, size, true);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      },
    };

    instance[programName] = wgglProgram;
  });

  instance.reset();

  if (instance.default) {
    instance.draw = instance.default.draw.bind(instance.default);
    instance.drawTo = instance.default.drawTo.bind(instance.default);
  }

  return instance;
}

function mergeAttrs(gl, program, source, attrs) {
  if (source[attr] != null) {
    console.warn(`Attribute ${attr} is being bound multiple times. Variable names should be unique across shaders and primitives`);
  }
  Object.keys(attrs).forEach(attr => {
    source[attr] = {
      location: locationForAttr(gl, program, attr, attrs[attr]),
      parameters: attrs[attr],
      buffer: null
    };
  });
}

function isAnyArray(arr) {
  if (arr == null) return false;

  // True when arr is any of the typed arrays or the basic array
  return /^(Float(32|64)|Int(8|16|32)|Uint(8(Clamped)?|16|32|))?Array$/.test(arr.constructor.name);
}

function locationForAttr(gl, program, key, value) {
  switch (value.glType) {
    case 'attribute':
      return gl.getAttribLocation(program, key);
    case 'uniform':
      return gl.getUniformLocation(program, key);
  }
}

function createShader(gl, type, source) {
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

function createProgram(gl, vertexShader, fragmentShader) {
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

function createTexture(gl, wrap, filter) {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);

  return texture;
}

export const QUAD2 = [
  -1, -1,
  1, -1,
  -1, 1,
  1, 1
];
