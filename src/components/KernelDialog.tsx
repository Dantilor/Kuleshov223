import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Select, MenuItem, 
  FormControl, InputLabel, Box, Checkbox, FormControlLabel
} from '@mui/material';

interface KernelDialogProps {
  open: boolean;
  onClose: () => void;
  kernel: number[];
  kernelName: string;
  preview: boolean;
  onKernelChange: (kernel: number[]) => void;
  onKernelNameChange: (name: string) => void;
  onPreviewChange: (preview: boolean) => void;
  onApply: () => void;
}

const KernelDialog = ({
  open,
  onClose,
  kernel,
  kernelName,
  preview,
  onKernelChange,
  onKernelNameChange,
  onPreviewChange,
  onApply
}: KernelDialogProps) => {
  const presets = [
    { name: 'identity', label: 'Тождественное отображение' },
    { name: 'sharpen', label: 'Повышение резкости' },
    { name: 'gaussian', label: 'Фильтр Гаусса (3x3)' },
    { name: 'boxBlur', label: 'Прямоугольное размытие' },
    { name: 'prewittX', label: 'Оператор Прюитта (X)' },
    { name: 'prewittY', label: 'Оператор Прюитта (Y)' }
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Фильтрация с использованием ядра</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="normal">
          <InputLabel>Предустановки</InputLabel>
          <Select
            value={kernelName}
            onChange={(e) => onKernelNameChange(e.target.value)}
            label="Предустановки"
          >
            {presets.map(preset => (
              <MenuItem key={preset.name} value={preset.name}>
                {preset.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box marginTop={2}>
          {[0, 1, 2].map(row => (
            <Box key={row} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              {[0, 1, 2].map(col => {
                const index = row * 3 + col;
                return (
                  <TextField
                    key={col}
                    fullWidth
                    type="number"
                    value={kernel[index]}
                    onChange={(e) => {
                      const newKernel = [...kernel];
                      newKernel[index] = parseFloat(e.target.value) || 0;
                      onKernelChange(newKernel);
                    }}
                  />
                );
              })}
            </Box>
          ))}
        </Box>

        <Box mt={2}>
          <FormControlLabel
            control={
              <Checkbox 
                checked={preview} 
                onChange={(e) => onPreviewChange(e.target.checked)} 
              />
            }
            label="Предпросмотр"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
        <Button 
          onClick={() => {
            const resetValues: Record<string, number[]> = {
              identity: [0,0,0,0,1,0,0,0,0],
              sharpen: [0,-1,0,-1,5,-1,0,-1,0],
              gaussian: [1,2,1,2,4,2,1,2,1],
              boxBlur: [1,1,1,1,1,1,1,1,1],
              prewittX: [-1,0,1,-1,0,1,-1,0,1],
              prewittY: [-1,-1,-1,0,0,0,1,1,1]
            };
            onKernelChange(resetValues[kernelName] || [0,0,0,0,1,0,0,0,0]);
          }}
        >
          Сбросить
        </Button>
        <Button 
          onClick={onApply} 
          variant="contained"
          color="primary"
        >
          Применить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default KernelDialog;