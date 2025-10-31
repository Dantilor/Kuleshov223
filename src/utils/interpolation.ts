// src/utils/interpolation.ts

// Метод ближайшего соседа
export function nearestNeighbor(
    src: ImageData, 
    destWidth: number, 
    destHeight: number
): ImageData {
    const dest = new ImageData(destWidth, destHeight);
    const srcData = src.data;
    const destData = dest.data;
    
    const xRatio = src.width / destWidth;
    const yRatio = src.height / destHeight;
    
    for (let y = 0; y < destHeight; y++) {
        for (let x = 0; x < destWidth; x++) {
            const srcX = Math.floor(x * xRatio);
            const srcY = Math.floor(y * yRatio);
            
            const srcIndex = (srcY * src.width + srcX) * 4;
            const destIndex = (y * destWidth + x) * 4;
            
            destData[destIndex] = srcData[srcIndex];         // R
            destData[destIndex + 1] = srcData[srcIndex + 1]; // G
            destData[destIndex + 2] = srcData[srcIndex + 2]; // B
            destData[destIndex + 3] = srcData[srcIndex + 3]; // A
        }
    }
    
    return dest;
}

// Билинейная интерполяция
export function bilinearInterpolation(
    src: ImageData, 
    destWidth: number, 
    destHeight: number
): ImageData {
    const dest = new ImageData(destWidth, destHeight);
    const srcData = src.data;
    const destData = dest.data;
    
    const xRatio = (src.width - 1) / destWidth;
    const yRatio = (src.height - 1) / destHeight;
    
    for (let y = 0; y < destHeight; y++) {
        for (let x = 0; x < destWidth; x++) {
            const srcX = x * xRatio;
            const srcY = y * yRatio;
            
            const x1 = Math.floor(srcX);
            const y1 = Math.floor(srcY);
            const x2 = Math.min(x1 + 1, src.width - 1);
            const y2 = Math.min(y1 + 1, src.height - 1);
            
            // Индексы для 4 окружающих точек
            const idx11 = (y1 * src.width + x1) * 4;
            const idx21 = (y1 * src.width + x2) * 4;
            const idx12 = (y2 * src.width + x1) * 4;
            const idx22 = (y2 * src.width + x2) * 4;
            
            // Веса для интерполяции
            const wx = srcX - x1;
            const wy = srcY - y1;
            
            // Интерполяция по X
            const r1 = srcData[idx11] + (srcData[idx21] - srcData[idx11]) * wx;
            const g1 = srcData[idx11 + 1] + (srcData[idx21 + 1] - srcData[idx11 + 1]) * wx;
            const b1 = srcData[idx11 + 2] + (srcData[idx21 + 2] - srcData[idx11 + 2]) * wx;
            const a1 = srcData[idx11 + 3] + (srcData[idx21 + 3] - srcData[idx11 + 3]) * wx;
            
            const r2 = srcData[idx12] + (srcData[idx22] - srcData[idx12]) * wx;
            const g2 = srcData[idx12 + 1] + (srcData[idx22 + 1] - srcData[idx12 + 1]) * wx;
            const b2 = srcData[idx12 + 2] + (srcData[idx22 + 2] - srcData[idx12 + 2]) * wx;
            const a2 = srcData[idx12 + 3] + (srcData[idx22 + 3] - srcData[idx12 + 3]) * wx;
            
            // Интерполяция по Y
            const r = r1 + (r2 - r1) * wy;
            const g = g1 + (g2 - g1) * wy;
            const b = b1 + (b2 - b1) * wy;
            const a = a1 + (a2 - a1) * wy;
            
            // Запись результата
            const destIndex = (y * destWidth + x) * 4;
            destData[destIndex] = Math.round(r);
            destData[destIndex + 1] = Math.round(g);
            destData[destIndex + 2] = Math.round(b);
            destData[destIndex + 3] = Math.round(a);
        }
    }
    
    return dest;
}