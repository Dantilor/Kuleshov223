import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    TextField, Select, MenuItem, FormControl, InputLabel, 
    Checkbox, FormControlLabel, Button, Tooltip,
    Box, Typography
} from '@mui/material';

interface ResizeModalProps {
    open: boolean;
    onClose: () => void;
    onResize: (width: number, height: number, method: string) => void;
    originalWidth: number;
    originalHeight: number;
}

const ResizeModal: React.FC<ResizeModalProps> = ({ 
    open, 
    onClose, 
    onResize,
    originalWidth,
    originalHeight
}) => {
    const [unit, setUnit] = useState<'pixels' | 'percent'>('pixels');
    const [width, setWidth] = useState<number>(originalWidth);
    const [height, setHeight] = useState<number>(originalHeight);
    const [keepAspect, setKeepAspect] = useState<boolean>(true);
    const [method, setMethod] = useState<'nearest' | 'bilinear'>('bilinear');
    const [aspectRatio, setAspectRatio] = useState<number>(originalWidth / originalHeight);

    useEffect(() => {
        setWidth(originalWidth);
        setHeight(originalHeight);
        setAspectRatio(originalWidth / originalHeight);
    }, [originalWidth, originalHeight]);

    const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newWidth = parseInt(e.target.value) || 0;
        setWidth(newWidth);
        
        if (keepAspect) {
            setHeight(Math.round(newWidth / aspectRatio));
        }
    };

    const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newHeight = parseInt(e.target.value) || 0;
        setHeight(newHeight);
        
        if (keepAspect) {
            setWidth(Math.round(newHeight * aspectRatio));
        }
    };

    const handleApply = () => {
        if (width <= 0 || height <= 0) {
            alert("Размеры должны быть больше нуля");
            return;
        }
        
        if (width > 10000 || height > 10000) {
            alert("Максимальный размер - 10000 пикселей");
            return;
        }
        
        onResize(width, height, method);
        onClose();
    };

    const getTooltipText = () => {
        if (method === 'nearest') {
            return "Метод ближайшего соседа: Быстрый, но может создавать пикселизированные края";
        }
        return "Билинейная интерполяция: Плавное масштабирование, лучшее качество";
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ color: '#ff0000', bgcolor: '#000' }}>
                Изменить размер изображения
            </DialogTitle>
            <DialogContent sx={{ bgcolor: '#1a1a1a', color: '#ff0000' }}>
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl fullWidth>
                        <InputLabel sx={{ color: '#ff0000' }}>Единицы измерения</InputLabel>
                        <Select
                            value={unit}
                            onChange={(e) => setUnit(e.target.value as 'pixels' | 'percent')}
                            sx={{ color: '#ff0000' }}
                            label="Единицы измерения"
                        >
                            <MenuItem value="pixels">Пиксели</MenuItem>
                            <MenuItem value="percent">Проценты</MenuItem>
                        </Select>
                    </FormControl>
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="Ширина"
                            type="number"
                            value={width}
                            onChange={handleWidthChange}
                            fullWidth
                            InputProps={{ sx: { color: '#ff0000' } }}
                            InputLabelProps={{ sx: { color: '#ff0000' } }}
                        />
                        <TextField
                            label="Высота"
                            type="number"
                            value={height}
                            onChange={handleHeightChange}
                            fullWidth
                            InputProps={{ sx: { color: '#ff0000' } }}
                            InputLabelProps={{ sx: { color: '#ff0000' } }}
                        />
                    </Box>
                    
                    <FormControlLabel
                        control={
                            <Checkbox 
                                checked={keepAspect} 
                                onChange={(e) => setKeepAspect(e.target.checked)}
                                sx={{ color: '#ff0000' }}
                            />
                        }
                        label="Сохранять пропорции"
                        sx={{ color: '#ff0000' }}
                    />
                    
                    <Tooltip title={getTooltipText()} arrow>
                        <FormControl fullWidth>
                            <InputLabel sx={{ color: '#ff0000' }}>Метод интерполяции</InputLabel>
                            <Select
                                value={method}
                                onChange={(e) => setMethod(e.target.value as 'nearest' | 'bilinear')}
                                sx={{ color: '#ff0000' }}
                                label="Метод интерполяции"
                            >
                                <MenuItem value="nearest">Ближайший сосед</MenuItem>
                                <MenuItem value="bilinear">Билинейная</MenuItem>
                            </Select>
                        </FormControl>
                    </Tooltip>
                    
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#2a2a2a', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ color: '#ff0000' }}>
                            Исходный размер: {originalWidth}×{originalHeight} пикселей
                            ({(originalWidth * originalHeight / 1000000).toFixed(2)} Мп)
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#ff0000' }}>
                            Новый размер: {width}×{height} пикселей
                            ({(width * height / 1000000).toFixed(2)} Мп)
                        </Typography>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ bgcolor: '#1a1a1a' }}>
                <Button onClick={onClose} sx={{ color: '#ff0000' }}>
                    Отмена
                </Button>
                <Button 
                    onClick={handleApply} 
                    variant="contained"
                    sx={{ bgcolor: '#ff0000', color: '#000' }}
                >
                    Применить
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ResizeModal;