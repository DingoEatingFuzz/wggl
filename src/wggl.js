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

// Bakes a vertex and fragment shader into a canvas and returns an object
// for operating with the resulting webgl program
export default (canvas, vertShader, fragShader) => {
  const gl = canvas.getContext('webgl');
  const bindPointers = {};

  if (!gl) {
    console.warn('No WebGL support');
    return;
  }

  const vs = createShader(gl, gl.VERTEX_SHADER, vertShader.src);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fragShader.src);
  let program = createProgram(gl, vs, fs);

  // Store the gl location (pointer) of each attribute provided to the vert and frag shaders
  // along with the read parameters of each attribute
  mergeAttrs(gl, program, bindPointers, vertShader.attrs);
  mergeAttrs(gl, program, bindPointers, fragShader.attrs);

  Object.entries(bindPointers).forEach(([key, value]) => {
    if (value.parameters.glType === 'attribute') {
      const buffer = gl.createBuffer();
      value.buffer = buffer;
    }
  });

  const instance = {
    canvas,
    gl,
    bindPointers,
    reset() {
      const { gl, canvas } = this;
      canvas.width = Math.floor(canvas.clientWidth * window.devicePixelRatio);
      canvas.height = Math.floor(canvas.clientHeight * window.devicePixelRatio);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
    draw(values, drawMode = 'TRIANGLE_STRIP', offset = 0, size = 4) {
      const gl = this.gl;
      let globalOffset = 0;
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
            } else {
              if (typeof value !== 'number' && typeof value !== 'boolean') {
                throw new Error('Value of uniform type must be a number, boolean, or array');
              }
              gl[`uniform1${typeModifier}`](attr.location, value);
            }

            break;
        }
      });

      // Draw the things
      gl.drawArrays(gl[drawMode], offset, size);
    }
  };

  instance.reset();
  gl.useProgram(program);

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
