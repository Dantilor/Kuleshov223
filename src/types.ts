export interface ImageInfo {
  name: string;
  size: number;
  type: string;
  width?: number;
  height?: number;
  depth?: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface XYZ {
  x: number;
  y: number;
  z: number;
}

export interface Lab {
  l: number;
  a: number;
  b: number;
}

export interface OKLCH {
  l: number;
  c: number;
  h: number;
}

export interface ColorData {
  rgb: RGB;
  xyz: XYZ;
  lab: Lab;
  oklch: OKLCH;
  position: { x: number; y: number };
  hex: string;
}

export interface Layer {
  id: string;
  name: string;
  image: HTMLImageElement | null;
  thumbnail: string;
  visible: boolean;
  opacity: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
  type: 'image' | 'color';
  color?: string;
  scale: number;
}