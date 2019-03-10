import { GlLocatable, GlType } from "./primitives";

export enum UniformType {
  float = "float",
  int = "int"
}

export class Uniform implements GlLocatable {
  public glType: GlType = GlType.uniform;

  constructor(
    public length: number = 1,
    public type: UniformType = UniformType.float
  ) {}
}
