// Типы для цветовых пространств
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

// Конвертация RGB в XYZ (D65 illuminant)
export const rgbToXyz = (r: number, g: number, b: number): XYZ => {
  let _r = r / 255;
  let _g = g / 255;
  let _b = b / 255;

  _r = _r > 0.04045 ? Math.pow((_r + 0.055) / 1.055, 2.4) : _r / 12.92;
  _g = _g > 0.04045 ? Math.pow((_g + 0.055) / 1.055, 2.4) : _g / 12.92;
  _b = _b > 0.04045 ? Math.pow((_b + 0.055) / 1.055, 2.4) : _b / 12.92;

  _r *= 100;
  _g *= 100;
  _b *= 100;

  return {
    x: _r * 0.4124 + _g * 0.3576 + _b * 0.1805,
    y: _r * 0.2126 + _g * 0.7152 + _b * 0.0722,
    z: _r * 0.0193 + _g * 0.1192 + _b * 0.9505
  };
};

// Конвертация XYZ в Lab
export const xyzToLab = (x: number, y: number, z: number): Lab => {
  // D65 reference white
  const refX = 95.047;
  const refY = 100.0;
  const refZ = 108.883;

  let _x = x / refX;
  let _y = y / refY;
  let _z = z / refZ;

  _x = _x > 0.008856 ? Math.pow(_x, 1/3) : (7.787 * _x) + 16/116;
  _y = _y > 0.008856 ? Math.pow(_y, 1/3) : (7.787 * _y) + 16/116;
  _z = _z > 0.008856 ? Math.pow(_z, 1/3) : (7.787 * _z) + 16/116;

  return {
    l: (116 * _y) - 16,
    a: 500 * (_x - _y),
    b: 200 * (_y - _z)
  };
};

// Конвертация RGB в OKLCH (упрощенная реализация)
export const rgbToOklch = (r: number, g: number, b: number): OKLCH => {
  // Преобразование RGB в HSL для примера
  const _r = r / 255;
  const _g = g / 255;
  const _b = b / 255;
  
  const max = Math.max(_r, _g, _b);
  const min = Math.min(_r, _g, _b);
  let h = 0, s, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case _r: h = (_g - _b) / d + (_g < _b ? 6 : 0); break;
      case _g: h = (_b - _r) / d + 2; break;
      case _b: h = (_r - _g) / d + 4; break;
    }
    
    h /= 6;
  } else {
    s = 0;
  }
  
  // Возвращаем упрощенные значения
  return {
    l: l,
    c: s,
    h: h * 360
  };
};

// Расчет контраста по WCAG 2.0 (G18)
export const wcagContrast = (rgb1: number[], rgb2: number[]): number => {
  const luminance1 = calculateRelativeLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const luminance2 = calculateRelativeLuminance(rgb2[0], rgb2[1], rgb2[2]);
  
  const l1 = Math.max(luminance1, luminance2);
  const l2 = Math.min(luminance1, luminance2);
  
  return (l1 + 0.05) / (l2 + 0.05);
};

const calculateRelativeLuminance = (r: number, g: number, b: number): number => {
  const rs = r / 255;
  const gs = g / 255;
  const bs = b / 255;
  
  const rL = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
  const gL = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
  const bL = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);
  
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
};