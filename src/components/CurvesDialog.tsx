import React, { useState, useEffect, useRef } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Checkbox, FormControlLabel, Box
} from '@mui/material';
import { calculateHistogram } from '../helpers/histogram';

interface Point {
  input: number;
  output: number;
}

interface CurvesDialogProps {
  open: boolean;
  onClose: () => void;
  imageData: ImageData | null;
  onApply: (lut: number[]) => void;
}

const CurvesDialog: React.FC<CurvesDialogProps> = ({ 
  open, 
  onClose, 
  imageData,
  onApply 
}) => {
  const [points, setPoints] = useState<Point[]>([
    { input: 0, output: 0 },
    { input: 255, output: 255 }
  ]);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [preview, setPreview] = useState(true);
  const [histogram, setHistogram] = useState<{ 
    r: number[]; g: number[]; b: number[]; a: number[] 
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Рассчет гистограммы при открытии диалога
  useEffect(() => {
    if (!open || !imageData) return;
    
    const hist = calculateHistogram(imageData);
    setHistogram(hist);
    setPoints([
      { input: 0, output: 0 },
      { input: 255, output: 255 }
    ]);
  }, [open, imageData]);

  // Рассчет таблицы преобразования (LUT)
  const computeLUT = (): number[] => {
    const lut = new Array(256).fill(0);
    const sortedPoints = [...points].sort((a, b) => a.input - b.input);
    
    // Интерполяция между точками
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const start = sortedPoints[i];
      const end = sortedPoints[i + 1];
      const range = end.input - start.input;
      
      for (let x = start.input; x <= end.input; x++) {
        const t = (x - start.input) / range;
        lut[x] = Math.round(start.output + t * (end.output - start.output));
      }
    }
    
    // Заполнение краев
    for (let i = 0; i < sortedPoints[0].input; i++) {
      lut[i] = sortedPoints[0].output;
    }
    for (let i = sortedPoints[sortedPoints.length-1].input; i < 256; i++) {
      lut[i] = sortedPoints[sortedPoints.length-1].output;
    }
    
    return lut;
  };

  // Применение коррекции к изображению

  // Обработчик изменения точки
  const handlePointChange = (index: number, field: 'input' | 'output', value: number) => {
    const newPoints = [...points];
    newPoints[index] = { ...newPoints[index], [field]: value };
    setPoints(newPoints);
  };

  // Обработчик сброса настроек
  const handleReset = () => {
    setPoints([
      { input: 0, output: 0 },
      { input: 255, output: 255 }
    ]);
  };

  // Обработчик применения коррекции
  const handleApply = () => {
    if (!imageData) return;
    const lut = computeLUT();
    onApply(lut);
    onClose();
  };

  // Обработчик перемещения точки
  const handleMouseMove = (e: React.MouseEvent) => {
    if (activePointIndex === null || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(255, Math.floor(e.clientX - rect.left)));
    const y = Math.max(0, Math.min(255, Math.floor(255 - (e.clientY - rect.top))));
    
    const newPoints = [...points];
    newPoints[activePointIndex] = { 
      input: x, 
      output: y 
    };
    setPoints(newPoints);
  };

  // Обработчик отпускания точки
  const handleMouseUp = () => {
    setActivePointIndex(null);
  };

  // Нормализация гистограммы для отображения
  const normalizeHistogram = (data: number[]): number[] => {
    if (!data.length) return [];
    const max = Math.max(...data);
    return data.map(value => Math.floor((value / max) * 100));
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          backgroundColor: '#333',
          color: '#fff'
        }
      }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid #555' }}>
        Градационная коррекция (Кривые)
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* График с гистограммой */}
          <Box sx={{ 
            position: 'relative', 
            width: '256px', 
            height: '256px', 
            backgroundColor: '#222',
            border: '1px solid #444',
            mb: 3,
            overflow: 'visible'
          }}>
            <svg 
              ref={svgRef}
              width="256" 
              height="256" 
              viewBox="0 0 256 256"
              style={{ position: 'absolute', top: 0, left: 0 }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Сетка */}
              {[...Array(16)].map((_, i) => (
                <React.Fragment key={i}>
                  <line 
                    x1={i * 16} 
                    y1="0" 
                    x2={i * 16} 
                    y2="256" 
                    stroke="#444" 
                    strokeWidth="0.5" 
                  />
                  <line 
                    x1="0" 
                    y1={i * 16} 
                    x2="256" 
                    y2={i * 16} 
                    stroke="#444" 
                    strokeWidth="0.5" 
                  />
                </React.Fragment>
              ))}

              {/* Оси */}
              <line x1="0" y1="256" x2="256" y2="256" stroke="#777" strokeWidth="1" />
              <line x1="0" y1="256" x2="0" y2="0" stroke="#777" strokeWidth="1" />

              {/* Гистограмма */}
              {histogram && (
                <>
                  {normalizeHistogram(histogram.b).map((value, i) => (
                    <line 
                      key={`b-${i}`}
                      x1={i} 
                      y1={256} 
                      x2={i} 
                      y2={256 - value} 
                      stroke="#4682B4" 
                      strokeWidth="1" 
                      opacity="0.6"
                    />
                  ))}
                  {normalizeHistogram(histogram.g).map((value, i) => (
                    <line 
                      key={`g-${i}`}
                      x1={i} 
                      y1={256} 
                      x2={i} 
                      y2={256 - value} 
                      stroke="#3CB371" 
                      strokeWidth="1" 
                      opacity="0.6"
                    />
                  ))}
                  {normalizeHistogram(histogram.r).map((value, i) => (
                    <line 
                      key={`r-${i}`}
                      x1={i} 
                      y1={256} 
                      x2={i} 
                      y2={256 - value} 
                      stroke="#CD5C5C" 
                      strokeWidth="1" 
                      opacity="0.6"
                    />
                  ))}
                </>
              )}

              {/* Кривая */}
              <polyline 
                points={points
                  .sort((a, b) => a.input - b.input)
                  .map(p => `${p.input},${256 - p.output}`)
                  .join(' ')} 
                fill="none" 
                stroke="#FFD700" 
                strokeWidth="2"
              />

              {/* Точки управления */}
              {points.map((point, index) => (
                <g key={index}>
                  <circle 
                    cx={point.input}
                    cy={256 - point.output}
                    r="5"
                    fill="#FFD700"
                    stroke="#000"
                    strokeWidth="1"
                    style={{ cursor: 'pointer' }}
                    onMouseDown={() => setActivePointIndex(index)}
                  />
                  <text 
                    x={point.input + 10} 
                    y={256 - point.output - 10} 
                    fill="#FFD700" 
                    fontSize="10"
                  >
                    ({point.input}, {point.output})
                  </text>
                </g>
              ))}

              {/* Вспомогательные линии для активной точки */}
              {activePointIndex !== null && (
                <>
                  <line 
                    x1={0} 
                    y1={256 - points[activePointIndex].output} 
                    x2={points[activePointIndex].input} 
                    y2={256 - points[activePointIndex].output} 
                    stroke="#FFD700" 
                    strokeDasharray="3,3" 
                  />
                  <line 
                    x1={points[activePointIndex].input} 
                    y1={256} 
                    x2={points[activePointIndex].input} 
                    y2={256 - points[activePointIndex].output} 
                    stroke="#FFD700" 
                    strokeDasharray="3,3" 
                  />
                </>
              )}
            </svg>
          </Box>

          {/* Поля ввода для точек */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            {points.map((point, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label={`Точка ${index + 1} (вх)`}
                  type="number"
                  size="small"
                  value={point.input}
                  onChange={(e) => 
                    handlePointChange(index, 'input', parseInt(e.target.value) || 0)
                  }
                  inputProps={{ min: 0, max: 255 }}
                  sx={{ width: '100px' }}
                />
                <TextField
                  label={`Точка ${index + 1} (вых)`}
                  type="number"
                  size="small"
                  value={point.output}
                  onChange={(e) => 
                    handlePointChange(index, 'output', parseInt(e.target.value) || 0)
                  }
                  inputProps={{ min: 0, max: 255 }}
                  sx={{ width: '100px' }}
                />
              </Box>
            ))}
          </Box>

          {/* Чекбокс предпросмотра */}
          <FormControlLabel
            control={
              <Checkbox
                checked={preview}
                onChange={(e) => setPreview(e.target.checked)}
                sx={{ color: '#FFD700' }}
              />
            }
            label="Предпросмотр"
            sx={{ color: '#fff' }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid #555', padding: '16px' }}>
        <Button 
          onClick={handleReset}
          sx={{ color: '#FFD700' }}
        >
          Сброс
        </Button>
        <Button 
          onClick={onClose}
          sx={{ color: '#aaa' }}
        >
          Отмена
        </Button>
        <Button 
          onClick={handleApply}
          variant="contained"
          sx={{ 
            backgroundColor: '#FFD700', 
            color: '#000',
            '&:hover': {
              backgroundColor: '#FFA500'
            }
          }}
        >
          Применить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CurvesDialog;