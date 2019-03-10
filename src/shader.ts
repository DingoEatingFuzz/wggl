export interface Shader {
  attrs: ShaderAttrs;
  src: string;
}

export interface ShaderAttrs {
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
