export function getColorDepth(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;

  const w = Math.min(10, canvas.width);
  const h = Math.min(10, canvas.height);
  const imageData = ctx.getImageData(0, 0, w, h).data;

  let hasAlpha = false;
  let isGrayscale = true;

  for (let i = 0; i < imageData.length; i += 4) {
    const [r, g, b, a] = [
      imageData[i],
      imageData[i + 1],
      imageData[i + 2],
      imageData[i + 3]
    ];

    if (a < 255) hasAlpha = true;
    if (!(r === g && g === b)) isGrayscale = false;
  }

  if (hasAlpha) return 32;
  if (isGrayscale) return 8;
  return 24;
}
