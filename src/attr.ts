import { GlLocatable, GlType } from "./primitives";

// Classes for storing state related to various buffer types before actually reading the buffers
export class Attr implements GlLocatable {
  public glType: GlType = GlType.attribute;

  constructor(
    public size: number = 1,
    public stride: number = 0,
    public offset: number = 0,
    public normalize: boolean = false
  ) {}
}
