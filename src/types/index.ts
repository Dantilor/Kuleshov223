export interface ImageInfo {
    name: string;
    size: number;
    type: string;
    width?: number;
    height?: number;
    depth?: number;
}
export type Kernel = [
  number, number, number,
  number, number, number,
  number, number, number
];