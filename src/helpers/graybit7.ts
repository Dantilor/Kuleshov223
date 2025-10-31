import { ImageInfo } from '../types';

export async function renderGrayBit7(
  bytes: Uint8Array,
  fileName: string,
  fileSize: number,
  canvas: HTMLCanvasElement
): Promise<ImageInfo> {
  if (bytes.length < 12) throw new Error("Файл слишком мал");

  const version = bytes[4];
  if (version !== 1) {
    throw new Error(`Неподдерживаемая версия формата GrayBit-7: ${version}`);
  }

  const flag = bytes[5];
  const hasMask = (flag & 0b1) === 1;
  const width = (bytes[6] << 8) | bytes[7];
  const height = (bytes[8] << 8) | bytes[9];
  const offset = 12;
  const expectedLength = offset + width * height;

  if (bytes.length < expectedLength) {
    throw new Error("Неверный размер изображения");
  }

  const ctx = canvas.getContext('2d')!;
  canvas.width = width;
  canvas.height = height;

  const imageData = ctx.createImageData(width, height);

  for (let i = 0; i < width * height; i++) {
    const byte = bytes[offset + i];
    const gray = byte & 0x7F;
    const mask = hasMask ? (byte & 0x80) >> 7 : 1;
    const value = (gray << 1) | ((gray >> 6) & 0x01);
    const alpha = mask ? 255 : 0;

    const idx = i * 4;
    imageData.data[idx + 0] = value;
    imageData.data[idx + 1] = value;
    imageData.data[idx + 2] = value;
    imageData.data[idx + 3] = alpha;
  }

  ctx.putImageData(imageData, 0, 0);

  return {
    name: fileName,
    size: fileSize,
    type: 'GrayBit-7',
    width,
    height,
    depth: hasMask ? 8 : 7
  };
}
