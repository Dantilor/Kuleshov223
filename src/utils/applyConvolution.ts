export const applyConvolution = (
  imageData: ImageData, 
  kernel: number[]
): ImageData => {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const result = new Uint8ClampedArray(data.length);
  const kSize = 3; // Размер ядра 3x3

  // Рассчитываем сумму ядра для нормализации
  const sum = kernel.reduce((acc, val) => acc + val, 0);
  const normalize = sum !== 0 ? sum : 1;

  // Копируем исходные данные
  result.set(data);

  // Обрабатываем каждый пиксель (исключая границы)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) { // RGB каналы
        let val = 0;
        
        // Применяем ядро
        for (let ky = 0; ky < kSize; ky++) {
          for (let kx = 0; kx < kSize; kx++) {
            const px = (x + kx - 1) * 4;
            const py = (y + ky - 1) * width * 4;
            const idx = py + px + c;
            
            val += data[idx] * kernel[ky * kSize + kx];
          }
        }
        
        // Нормализуем и ограничиваем значение
        val /= normalize;
        val = Math.min(255, Math.max(0, val));
        
        const pos = (y * width + x) * 4 + c;
        result[pos] = val;
      }
    }
  }
  
  return new ImageData(result, width, height);
};