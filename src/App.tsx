import React, { useState, useRef, useEffect } from 'react';
import {
    AppBar, Toolbar, Typography, Box, Button, Container,
    CssBaseline, Paper, Alert, IconButton, Slider,
    Drawer, Tooltip, Select, MenuItem, FormControl, InputLabel,
    Tab, Tabs, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Checkbox, FormControlLabel
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ResizeIcon from '@mui/icons-material/AspectRatio';
import ColorizeIcon from '@mui/icons-material/Colorize';
import PanToolIcon from '@mui/icons-material/PanTool';
import LayersIcon from '@mui/icons-material/Layers';
import SettingsIcon from '@mui/icons-material/Settings';
import './App.css';
import ImageCanvas from './components/ImageCanvas';
import ResizeModal from './components/ResizeModal';
import { renderGrayBit7 } from './helpers/graybit7';
import { getColorDepth } from './utils/colorDepth';
import { nearestNeighbor, bilinearInterpolation } from './utils/interpolation';
import {
    rgbToXyz, xyzToLab, rgbToOklch,
    wcagContrast
} from './utils/colorUtils';
import { ImageInfo, ColorData, Layer } from './types';
import ColorInfoPanel from './components/ColorInfoPanel';
import LayersPanel from './components/LayersPanel';
import TuneIcon from '@mui/icons-material/Tune';
import CurvesDialog from './components/CurvesDialog';

// Предустановленные ядра для фильтрации
const KERNEL_PRESETS = {
    identity: [0, 0, 0, 0, 1, 0, 0, 0, 0],
    sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
    gaussian: [1, 2, 1, 2, 4, 2, 1, 2, 1],
    boxBlur: [1, 1, 1, 1, 1, 1, 1, 1, 1],
    prewittX: [-1, 0, 1, -1, 0, 1, -1, 0, 1],
    prewittY: [-1, -1, -1, 0, 0, 0, 1, 1, 1]
};

function App() {
    const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
    const [imageData, setImageData] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [openMenu, setOpenMenu] = useState(false);
    const [openResizeModal, setOpenResizeModal] = useState(false);
    const [scale, setScale] = useState<number>(100);
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
    const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
    const [activeTool, setActiveTool] = useState<'hand' | 'eyedropper' | null>(null);
    const [, setImagePosition] = useState({ x: 0, y: 0 });
    const [primaryColor, setPrimaryColor] = useState<ColorData | null>(null);
    const [secondaryColor, setSecondaryColor] = useState<ColorData | null>(null);
    const [showColorPanel, setShowColorPanel] = useState(false);
    const [contrastValue, setContrastValue] = useState<number | null>(null);
    const [contrastWarning, setContrastWarning] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const [layers, setLayers] = useState<Layer[]>([]);
    const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
    const [openLayerDialog, setOpenLayerDialog] = useState(false);
    const [newLayerColor, setNewLayerColor] = useState('#ffffff');
    const [menuTab, setMenuTab] = useState<'settings' | 'layers'>('settings');
    const [newLayerType, setNewLayerType] = useState<'image' | 'color'>('image');
    const [newLayerImage, setNewLayerImage] = useState<string | null>(null);

    // Состояния для кривых
    const [curvesDialogOpen, setCurvesDialogOpen] = useState(false);
    const [currentImageDataForCurves, setCurrentImageDataForCurves] =
        useState<ImageData | null>(null);

    // Состояния для фильтрации ядрами
    const [kernelDialogOpen, setKernelDialogOpen] = useState(false);
    const [kernel, setKernel] = useState<number[]>(KERNEL_PRESETS.identity);
    const [kernelName, setKernelName] = useState<string>('identity');
    const [preview, setPreview] = useState(true);
    const [originalLayerImage, setOriginalLayerImage] = useState<HTMLImageElement | null>(null);

    // Функция изменения масштаба слоя
    const changeLayerScale = (id: string, scale: number) => {
        setLayers(prev => prev.map(layer =>
            layer.id === id ? { ...layer, scale } : layer
        ));
    };

    // Функция открытия диалога кривых
    const handleOpenCurvesDialog = () => {
        if (!activeLayerId || !canvasRef.current) return;

        const activeLayer = layers.find(l => l.id === activeLayerId);
        if (!activeLayer || !activeLayer.image) return;

        const canvas = document.createElement('canvas');
        canvas.width = activeLayer.image.width;
        canvas.height = activeLayer.image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(activeLayer.image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        setCurrentImageDataForCurves(imageData);
        setCurvesDialogOpen(true);
    };

    // Функция применения кривых
    const handleApplyCurves = (lut: number[]) => {
        if (!currentImageDataForCurves || !activeLayerId) return;

        const correctedData = applyCurvesCorrection(currentImageDataForCurves, lut);

        const canvas = document.createElement('canvas');
        canvas.width = correctedData.width;
        canvas.height = correctedData.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.putImageData(correctedData, 0, 0);
        const dataUrl = canvas.toDataURL();
        const img = new Image();
        img.src = dataUrl;

        setLayers(prev => prev.map(layer =>
            layer.id === activeLayerId ? { ...layer, image: img } : layer
        ));

        setCurvesDialogOpen(false);
    };

    // Функция применения коррекции
    const applyCurvesCorrection = (imgData: ImageData, lut: number[]): ImageData => {
        const newData = new ImageData(imgData.width, imgData.height);
        const src = imgData.data;
        const dst = newData.data;

        for (let i = 0; i < src.length; i += 4) {
            dst[i] = lut[src[i]];       // R
            dst[i + 1] = lut[src[i + 1]];   // G
            dst[i + 2] = lut[src[i + 2]];   // B
            dst[i + 3] = src[i + 3];        // Alpha
        }

        return newData;
    };

    // Открытие диалога фильтрации ядрами
    const handleOpenKernelDialog = () => {
        if (!activeLayerId) {
            setError('Выберите активный слой');
            return;
        }

        const activeLayer = layers.find(l => l.id === activeLayerId);
        if (!activeLayer || !activeLayer.image) {
            setError('Активный слой не содержит изображения');
            return;
        }

        // Сохраняем оригинальное изображение слоя
        setOriginalLayerImage(activeLayer.image);
        setKernelDialogOpen(true);
    };

    // Закрытие диалога фильтрации
    const handleCloseKernelDialog = () => {
        // Восстанавливаем оригинальное изображение
        if (originalLayerImage && activeLayerId) {
            setLayers(prev => prev.map(layer =>
                layer.id === activeLayerId ? { ...layer, image: originalLayerImage } : layer
            ));
        }
        setKernelDialogOpen(false);
    };

    // Применение фильтра ядра
    const handleApplyKernel = async () => {
        if (!activeLayerId || !originalLayerImage) return;

        const newImage = await applyKernelFilter(originalLayerImage, kernel);

        setLayers(prev => prev.map(layer =>
            layer.id === activeLayerId ? { ...layer, image: newImage } : layer
        ));

        setKernelDialogOpen(false);
    };

    // Применение фильтра к изображению
    const applyKernelFilter = (image: HTMLImageElement, kernel: number[]): Promise<HTMLImageElement> => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(image);

            ctx.drawImage(image, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // Создаем Web Worker для обработки
            const worker = new Worker(new URL('./workers/convolutionWorker.ts', import.meta.url), {
                name: 'convolution-worker',
                type: 'module'
            });
            worker.postMessage({
                imageData,
                kernel
            }, [
                imageData.data.buffer
            ]);

            worker.onmessage = (e) => {
                const resultImageData = e.data;

                // Создаем новое изображение из результатов
                const resultCanvas = document.createElement('canvas');
                resultCanvas.width = resultImageData.width;
                resultCanvas.height = resultImageData.height;
                const resultCtx = resultCanvas.getContext('2d');
                if (!resultCtx) return resolve(image);

                resultCtx.putImageData(resultImageData, 0, 0);
                const newImage = new Image();
                newImage.src = resultCanvas.toDataURL();

                newImage.onload = () => {
                    resolve(newImage);
                    worker.terminate();
                };
            };
        });
    };

    // Изменение ядра при выборе предустановки
    const handleKernelPresetChange = (presetName: string) => {
        setKernelName(presetName);
        setKernel(KERNEL_PRESETS[presetName as keyof typeof KERNEL_PRESETS]);
    };

    // Инициализация базового слоя при загрузке изображения
    useEffect(() => {
        if (!originalImage) return;

        const createThumbnail = (img: HTMLImageElement): string => {
            const canvas = document.createElement('canvas');
            canvas.width = 50;
            canvas.height = 50;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, 50, 50);
                return canvas.toDataURL();
            }
            return '';
        };

        const baseLayer: Layer = {
            id: 'base-layer',
            name: 'Базовый слой',
            image: originalImage,
            thumbnail: createThumbnail(originalImage),
            visible: true,
            opacity: 1,
            blendMode: 'normal',
            type: 'image',
            scale: 100
        };

        setLayers([baseLayer]);
        setActiveLayerId('base-layer');
    }, [originalImage]);

    // Отрисовка всех слоев
    useEffect(() => {
        if (!canvasRef.current || layers.length === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Рассчет размеров холста с учетом масштаба слоев
        let maxWidth = 0;
        let maxHeight = 0;

        layers.forEach(layer => {
            if (!layer.image) return;

            const layerWidth = layer.image.width * (layer.scale / 100);
            const layerHeight = layer.image.height * (layer.scale / 100);

            if (layerWidth > maxWidth) maxWidth = layerWidth;
            if (layerHeight > maxHeight) maxHeight = layerHeight;
        });

        // Устанавливаем размеры холста
        canvas.width = maxWidth;
        canvas.height = maxHeight;
        canvas.style.width = `${maxWidth * (scale / 100)}px`;
        canvas.style.height = `${maxHeight * (scale / 100)}px`;

        // Очищаем холст
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Рисуем слои в порядке их добавления
        layers.forEach(layer => {
            if (!layer.visible || !layer.image) return;

            ctx.globalAlpha = layer.opacity;

            // Устанавливаем режим наложения
            switch (layer.blendMode) {
                case 'multiply':
                    ctx.globalCompositeOperation = 'multiply';
                    break;
                case 'screen':
                    ctx.globalCompositeOperation = 'screen';
                    break;
                case 'overlay':
                    ctx.globalCompositeOperation = 'overlay';
                    break;
                default:
                    ctx.globalCompositeOperation = 'source-over';
            }

            // Применяем масштаб слоя при отрисовке
            const layerWidth = layer.image.width * (layer.scale / 100);
            const layerHeight = layer.image.height * (layer.scale / 100);

            ctx.drawImage(layer.image, 0, 0, layerWidth, layerHeight);
        });

        // Сбрасываем параметры
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';

    }, [layers, scale]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        const reader = new FileReader();

        reader.onload = async (event) => {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            const uint8 = new Uint8Array(arrayBuffer);

            if (uint8[0] === 0x47 && uint8[1] === 0x42 && uint8[2] === 0x37 && uint8[3] === 0x1D) {
                try {
                    const info = await renderGrayBit7(uint8, file.name, file.size, canvasRef.current!);
                    setImageInfo(info);
                    setImageData(null);
                    saveOriginalImage();
                } catch (err) {
                    console.error(err);
                    setError('Ошибка при разборе файла GrayBit-7');
                }
                return;
            }

            setImageInfo({
                name: file.name,
                size: file.size,
                type: file.type || file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN'
            });

            const base64Reader = new FileReader();
            base64Reader.onload = (event) => {
                if (event.target?.result) {
                    setImageData(event.target.result as string);
                }
            };
            base64Reader.readAsDataURL(file);
        };

        reader.onerror = () => {
            setError('Ошибка чтения файла');
        };

        reader.readAsArrayBuffer(file);
    };

    const saveOriginalImage = () => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const img = new Image();
        img.src = canvas.toDataURL();

        img.onload = () => {
            setOriginalImage(img);

            // Сохраняем ImageData оригинального изображения
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const ctx = tempCanvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                setOriginalImageData(ctx.getImageData(0, 0, img.width, img.height));
            }
        };
    };

    useEffect(() => {
        if (!imageData || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
            const container = containerRef.current;
            if (!container) return;

            // Рассчитываем начальный масштаб для вписывания в контейнер
            const maxWidth = container.clientWidth - 100;
            const maxHeight = container.clientHeight - 200;

            let scaleX = maxWidth / img.width;
            let scaleY = maxHeight / img.height;
            const initialScale = Math.min(scaleX, scaleY) * 100;

            // Устанавливаем масштаб и сохраняем изображение
            setScale(Math.min(100, Math.floor(initialScale)));

            // Сохраняем оригинальное изображение и его данные
            setOriginalImage(img);
            setImagePosition({ x: 0, y: 0 }); // Сбрасываем позицию

            // Сохраняем ImageData
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
                tempCtx.drawImage(img, 0, 0);
                setOriginalImageData(tempCtx.getImageData(0, 0, img.width, img.height));
            }

            // Обновляем информацию
            setImageInfo(prev => prev ? {
                ...prev,
                width: img.width,
                height: img.height,
                depth: getColorDepth(canvas)
            } : null);
        };
        img.onerror = () => {
            setError('Ошибка загрузки изображения');
        };
        img.src = imageData;
    }, [imageData]);

    const handleResize = (width: number, height: number, method: string) => {
        if (!originalImage || !canvasRef.current || !originalImageData) return;

        // Применяем интерполяцию
        let resizedImageData: ImageData;
        if (method === 'nearest') {
            resizedImageData = nearestNeighbor(originalImageData, width, height);
        } else {
            resizedImageData = bilinearInterpolation(originalImageData, width, height);
        }

        // Создаем новое изображение из результатов интерполяции
        const resizedImage = new Image();
        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = width;
        resizedCanvas.height = height;
        const resizedCtx = resizedCanvas.getContext('2d');
        if (!resizedCtx) return;

        resizedCtx.putImageData(resizedImageData, 0, 0);
        resizedImage.src = resizedCanvas.toDataURL();

        resizedImage.onload = () => {
            // Обновляем оригинальное изображение
            setOriginalImage(resizedImage);
            setOriginalImageData(resizedImageData);
            setImagePosition({ x: 0, y: 0 }); // Сбрасываем позицию

            // Рассчет нового масштаба для отображения
            const container = containerRef.current;
            if (!container) return;

            const maxWidth = container.clientWidth - 100;
            const maxHeight = container.clientHeight - 200;

            let displayWidth = width;
            let displayHeight = height;

            if (displayWidth > maxWidth) {
                displayHeight = (maxWidth / displayWidth) * displayHeight;
                displayWidth = maxWidth;
            }

            if (displayHeight > maxHeight) {
                displayWidth = (maxHeight / displayHeight) * displayWidth;
                displayHeight = maxHeight;
            }

            const newScale = (displayWidth / width) * 100;
            setScale(Math.round(newScale));

            // Обновляем информацию
            setImageInfo(prev => prev ? {
                ...prev,
                width: width,
                height: height,
                depth: getColorDepth(canvasRef.current!)
            } : null);
        };
    };

    const toggleMenu = () => setOpenMenu(!openMenu);

    const handleToolChange = (tool: 'hand' | 'eyedropper') => {
        setActiveTool(tool);
        setShowColorPanel(tool === 'eyedropper');

        if (tool === 'hand') {
            document.body.style.cursor = 'grab';
        } else {
            document.body.style.cursor = 'crosshair';
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (activeTool !== 'hand' || !originalImage || !imageContainerRef.current) return;

        isDragging.current = true;
        dragStart.current = {
            x: e.clientX,
            y: e.clientY
        };

        document.body.style.cursor = 'grabbing';
        e.preventDefault();
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (activeTool === 'hand' && isDragging.current && originalImage && imageContainerRef.current) {
            const dx = e.clientX - dragStart.current.x;
            const dy = e.clientY - dragStart.current.y;

            // Обновляем позицию контейнера
            imageContainerRef.current.scrollLeft -= dx;
            imageContainerRef.current.scrollTop -= dy;

            // Обновляем начальную позицию для следующего движения
            dragStart.current = {
                x: e.clientX,
                y: e.clientY
            };
        }
    };

    const handleMouseUp = () => {
        if (activeTool === 'hand') {
            isDragging.current = false;
            document.body.style.cursor = 'grab';
        }
    };

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (activeTool !== 'eyedropper' || !canvasRef.current || !originalImageData || !imageContainerRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Координаты относительно холста
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;

        // Масштабный коэффициент
        const scaleFactor = scale / 100;

        // Координаты в исходном изображении
        const x = Math.floor(canvasX / scaleFactor);
        const y = Math.floor(canvasY / scaleFactor);

        // Проверка границ
        if (x < 0 || y < 0 || x >= originalImageData.width || y >= originalImageData.height) return;

        // Получение цвета
        const index = (y * originalImageData.width + x) * 4;
        const r = originalImageData.data[index];
        const g = originalImageData.data[index + 1];
        const b = originalImageData.data[index + 2];

        // Конвертация в другие цветовые пространства
        const xyz = rgbToXyz(r, g, b);
        const lab = xyzToLab(xyz.x, xyz.y, xyz.z);
        const oklch = rgbToOklch(r, g, b);

        const colorData: ColorData = {
            rgb: { r, g, b },
            xyz,
            lab,
            oklch,
            position: { x, y },
            hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
        };

        if (e.altKey || e.ctrlKey || e.shiftKey) {
            setSecondaryColor(colorData);

            // Расчет контраста при наличии двух цветов
            if (primaryColor) {
                const contrast = wcagContrast(
                    [primaryColor.rgb.r, primaryColor.rgb.g, primaryColor.rgb.b],
                    [r, g, b]
                );
                setContrastValue(contrast);
                setContrastWarning(contrast < 4.5);
            }
        } else {
            setPrimaryColor(colorData);
            setContrastValue(null);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'h' || e.key === 'H') {
                handleToolChange('hand');
            } else if (e.key === 'e' || e.key === 'E') {
                handleToolChange('eyedropper');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Функции для работы со слоями
    const addLayer = (type: 'image' | 'color', image?: string, color?: string) => {
        if (layers.length >= 5) {
            setError('Максимальное количество слоев: 5');
            return;
        }

        const id = `layer-${Date.now()}`;
        const name = type === 'image' ? 'Новый слой' : 'Цветной слой';

        let img: HTMLImageElement | null = null;
        let thumbnail = '';

        if (type === 'image' && image) {
            img = new Image();
            img.src = image;

            // Создаем миниатюру
            const canvas = document.createElement('canvas');
            canvas.width = 50;
            canvas.height = 50;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, 50, 50);
                img.onload = () => {
                    ctx.drawImage(img!, 0, 0, 50, 50);
                    thumbnail = canvas.toDataURL();

                    // Обновляем слой после загрузки изображения
                    setLayers(prev => prev.map(l =>
                        l.id === id ? { ...l, thumbnail } : l
                    ));
                };
            }
        } else if (type === 'color' && color) {
            // Для цветного слоя создаем цветной квадрат
            const canvas = document.createElement('canvas');
            canvas.width = 50;
            canvas.height = 50;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = color;
                ctx.fillRect(0, 0, 50, 50);
                thumbnail = canvas.toDataURL();
            }

            // Создаем изображение для слоя
            img = new Image();
            const colorCanvas = document.createElement('canvas');
            colorCanvas.width = 800;
            colorCanvas.height = 600;
            const colorCtx = colorCanvas.getContext('2d');
            if (colorCtx) {
                colorCtx.fillStyle = color;
                colorCtx.fillRect(0, 0, 800, 600);
                img.src = colorCanvas.toDataURL();
            }
        }

        const newLayer: Layer = {
            id,
            name,
            image: img,
            thumbnail,
            visible: true,
            opacity: 1,
            blendMode: 'normal',
            type,
            color,
            scale: 100
        };

        setLayers(prev => [...prev, newLayer]);
        setActiveLayerId(id);
        setOpenLayerDialog(false);
    };

    const removeLayer = (id: string) => {
        if (id === 'base-layer') {
            setError('Нельзя удалить базовый слой');
            return;
        }

        setLayers(prev => prev.filter(layer => layer.id !== id));

        // Если удаляем активный слой, переключаемся на базовый
        if (activeLayerId === id) {
            setActiveLayerId('base-layer');
        }
    };

    const toggleLayerVisibility = (id: string) => {
        setLayers(prev => prev.map(layer =>
            layer.id === id ? { ...layer, visible: !layer.visible } : layer
        ));
    };

    const changeLayerOpacity = (id: string, opacity: number) => {
        setLayers(prev => prev.map(layer =>
            layer.id === id ? { ...layer, opacity } : layer
        ));
    };

    const changeLayerBlendMode = (id: string, mode: 'normal' | 'multiply' | 'screen' | 'overlay') => {
        setLayers(prev => prev.map(layer =>
            layer.id === id ? { ...layer, blendMode: mode } : layer
        ));
    };

    const moveLayer = (id: string, direction: 'up' | 'down') => {
        const index = layers.findIndex(l => l.id === id);
        if (index === -1) return;

        const newLayers = [...layers];

        if (direction === 'up' && index < newLayers.length - 1) {
            [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
        } else if (direction === 'down' && index > 0) {
            [newLayers[index], newLayers[index - 1]] = [newLayers[index - 1], newLayers[index]];
        }

        setLayers(newLayers);
    };

    const handleNewLayerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setNewLayerImage(event.target.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const confirmAddLayer = () => {
        if (newLayerType === 'image' && newLayerImage) {
            addLayer('image', newLayerImage);
        } else if (newLayerType === 'color') {
            addLayer('color', undefined, newLayerColor);
        }
    };

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            overflow: 'hidden',
            backgroundColor: '#121212'
        }}>
            <CssBaseline />

            <AppBar position="static" sx={{
                backgroundColor: '#000',
                borderBottom: '3px solid #ff0000',
                flexShrink: 0
            }}>
                <Toolbar sx={{
                    justifyContent: 'space-between',
                    padding: '8px 12px'
                }}>
                    <Typography variant="h6" sx={{
                        color: '#ff0000',
                        fontSize: '1.1rem'
                    }}>
                        PhotoShopKuleshov
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Hand Tool [H] - Move image">
                            <IconButton
                                onClick={() => handleToolChange('hand')}
                                sx={{
                                    bgcolor: activeTool === 'hand' ? '#ff0000' : 'transparent',
                                    color: activeTool === 'hand' ? '#000' : '#fff',
                                    borderRadius: '4px',
                                    padding: '6px',
                                    '&:hover': {
                                        bgcolor: activeTool === 'hand' ? '#ff3333' : '#333'
                                    }
                                }}
                            >
                                <PanToolIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Eyedropper Tool [E] - Pick colors">
                            <IconButton
                                onClick={() => handleToolChange('eyedropper')}
                                sx={{
                                    bgcolor: activeTool === 'eyedropper' ? '#ff0000' : 'transparent',
                                    color: activeTool === 'eyedropper' ? '#000' : '#fff',
                                    borderRadius: '4px',
                                    padding: '6px',
                                    '&:hover': {
                                        bgcolor: activeTool === 'eyedropper' ? '#ff3333' : '#333'
                                    }
                                }}
                            >
                                <ColorizeIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>

                        <Button
                            component="label"
                            variant="contained"
                            startIcon={<UploadIcon />}
                            sx={{
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                backgroundColor: '#ff0000',
                                color: '#000',
                                '&:hover': {
                                    backgroundColor: '#ff3333'
                                }
                            }}
                        >
                            Загрузить
                            <input
                                type="file"
                                hidden
                                accept=".jpg,.jpeg,.png,.gb7"
                                onChange={handleImageUpload}
                            />
                        </Button>

                        <IconButton
                            sx={{
                                backgroundColor: '#ff0000',
                                color: '#000',
                                padding: '6px',
                                '&:hover': {
                                    backgroundColor: '#ff3333'
                                }
                            }}
                            onClick={toggleMenu}
                        >
                            <MenuIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Toolbar>
            </AppBar>

            <Container
                ref={containerRef}
                component="main"
                maxWidth={false}
                disableGutters
                sx={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#000',
                    position: 'relative'
                }}
            >
                <Paper
                    elevation={3}
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'auto',
                        p: 2,
                        backgroundColor: '#1e1e1e',
                        position: 'relative'
                    }}
                >
                    <Typography variant="h5" component="h1" gutterBottom align="center" sx={{
                        color: '#fff',
                        fontSize: '1.3rem',
                        mb: 2
                    }}>
                        Загрузите изображение
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ my: 1 }}>{error}</Alert>
                    )}

                    <Box
                        ref={imageContainerRef}
                        sx={{
                            flex: 1,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            border: '1px dashed #444',
                            borderRadius: '8px',
                            backgroundColor: '#000',
                            overflow: 'auto',
                            position: 'relative',
                            minHeight: '300px',
                            backgroundImage: scale > 300 ?
                                'linear-gradient(to right, rgba(255, 0, 0, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 0, 0, 0.1) 1px, transparent 1px)' :
                                'none',
                            backgroundSize: '20px 20px',
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onClick={handleCanvasClick}
                    >
                        <ImageCanvas ref={canvasRef} visible={!!imageInfo} />

                        {/* Индикатор пикселизации */}
                        {scale > 100 && (
                            <Box sx={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                color: '#ff0000',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <Box sx={{
                                    width: '10px',
                                    height: '10px',
                                    backgroundColor: '#ff0000',
                                    marginRight: '6px',
                                    border: '1px solid #fff'
                                }} />
                                Пиксельный режим
                            </Box>
                        )}

                        {/* Индикатор избытка пикселей */}
                        {scale < 100 && scale > 50 && (
                            <Box sx={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                color: '#ff5555',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <Box sx={{
                                    width: '10px',
                                    height: '10px',
                                    backgroundColor: '#ff5555',
                                    marginRight: '6px',
                                    borderRadius: '50%'
                                }} />
                                Избыток пикселей
                            </Box>
                        )}

                        {!imageInfo && (
                            <Typography variant="body1" sx={{
                                color: '#666',
                                position: 'absolute',
                                textAlign: 'center',
                                px: 2
                            }}>
                                Изображение появится после загрузки
                            </Typography>
                        )}
                    </Box>

                    {imageInfo && (
                        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="body2" sx={{ color: '#aaa' }}>
                                Масштаб:
                            </Typography>
                            <Slider
                                value={scale}
                                onChange={(_, value) => setScale(value as number)}
                                min={10}
                                max={1000}
                                step={1}
                                sx={{
                                    flex: 1,
                                    color: '#ff0000',
                                    '& .MuiSlider-thumb': {
                                        backgroundColor: '#ff0000'
                                    }
                                }}
                                marks={[
                                    { value: 100, label: '100%' },
                                    { value: 200, label: 'Пикселизация' },
                                    { value: 50, label: 'Избыток' }
                                ]}
                            />
                            <Typography variant="body2" sx={{
                                color: '#ff0000',
                                minWidth: '50px'
                            }}>
                                {scale}%
                            </Typography>
                        </Box>
                    )}

                    {imageInfo && (
                        <Box sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1,
                            mt: 2,
                            p: 1,
                            backgroundColor: '#2a2a2a',
                            borderRadius: '6px'
                        }}>
                            <Typography variant="body2" sx={{ color: '#aaa', flex: '1 1 45%' }}>
                                Имя: <strong style={{ color: '#fff' }}>{imageInfo.name}</strong>
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#aaa', flex: '1 1 45%' }}>
                                Тип: <strong style={{ color: '#fff' }}>{imageInfo.type}</strong>
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#aaa', flex: '1 1 45%' }}>
                                Размер: <strong style={{ color: '#fff' }}>{(imageInfo.size / 1024).toFixed(2)} KB</strong>
                            </Typography>
                            {imageInfo.width && imageInfo.height && (
                                <>
                                    <Typography variant="body2" sx={{ color: '#aaa', flex: '1 1 45%' }}>
                                        Ширина: <strong style={{ color: '#fff' }}>{Math.round(imageInfo.width)}px</strong>
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#aaa', flex: '1 1 45%' }}>
                                        Высота: <strong style={{ color: '#fff' }}>{Math.round(imageInfo.height)}px</strong>
                                    </Typography>
                                </>
                            )}
                            {imageInfo.depth && (
                                <Typography variant="body2" sx={{ color: '#aaa', flex: '1 1 45%' }}>
                                    Глубина: <strong style={{ color: '#fff' }}>{imageInfo.depth} бит</strong>
                                </Typography>
                            )}
                        </Box>
                    )}
                </Paper>

                <ColorInfoPanel
                    showColorPanel={showColorPanel}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    contrastValue={contrastValue}
                    contrastWarning={contrastWarning}
                />
            </Container>

            <ResizeModal
                open={openResizeModal}
                onClose={() => setOpenResizeModal(false)}
                onResize={handleResize}
                originalWidth={originalImage?.width || 0}
                originalHeight={originalImage?.height || 0}
            />

            <CurvesDialog
                open={curvesDialogOpen}
                onClose={() => setCurvesDialogOpen(false)}
                imageData={currentImageDataForCurves}
                onApply={handleApplyCurves}
            />

            {/* Диалог фильтрации ядрами */}
            <Dialog open={kernelDialogOpen} onClose={handleCloseKernelDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Фильтрация с использованием ядра</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Предустановки</InputLabel>
                        <Select
                            value={kernelName}
                            onChange={(e) => handleKernelPresetChange(e.target.value)}
                            label="Предустановки"
                        >
                            <MenuItem value="identity">Тождественное отображение</MenuItem>
                            <MenuItem value="sharpen">Повышение резкости</MenuItem>
                            <MenuItem value="gaussian">Фильтр Гаусса (3x3)</MenuItem>
                            <MenuItem value="boxBlur">Прямоугольное размытие</MenuItem>
                            <MenuItem value="prewittX">Оператор Прюитта (X)</MenuItem>
                            <MenuItem value="prewittY">Оператор Прюитта (Y)</MenuItem>
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
                                                setKernel(newKernel);
                                            }}
                                            sx={{ flex: 1 }}
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
                                    onChange={(e) => setPreview(e.target.checked)}
                                />
                            }
                            label="Предпросмотр"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseKernelDialog}>Закрыть</Button>
                    <Button
                        onClick={() => setKernel(KERNEL_PRESETS[kernelName as keyof typeof KERNEL_PRESETS])}
                    >
                        Сбросить
                    </Button>
                    <Button
                        onClick={handleApplyKernel}
                        variant="contained"
                        color="primary"
                    >
                        Применить
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openLayerDialog} onClose={() => setOpenLayerDialog(false)}>
                <DialogTitle>Добавить новый слой</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Тип слоя</InputLabel>
                        <Select
                            value={newLayerType}
                            onChange={(e) => setNewLayerType(e.target.value as 'image' | 'color')}
                            label="Тип слоя"
                        >
                            <MenuItem value="image">Изображение</MenuItem>
                            <MenuItem value="color">Цветная заливка</MenuItem>
                        </Select>
                    </FormControl>

                    {newLayerType === 'image' && (
                        <Box>
                            <Button
                                component="label"
                                variant="contained"
                                fullWidth
                                startIcon={<UploadIcon />}
                                sx={{ mb: 2 }}
                            >
                                Загрузить изображение
                                <input
                                    type="file"
                                    hidden
                                    accept=".jpg,.jpeg,.png"
                                    onChange={handleNewLayerImageUpload}
                                />
                            </Button>

                            {newLayerImage && (
                                <Box sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    mt: 2
                                }}>
                                    <img
                                        src={newLayerImage}
                                        alt="Предпросмотр"
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '200px',
                                            border: '1px solid #444'
                                        }}
                                    />
                                </Box>
                            )}
                        </Box>
                    )}

                    {newLayerType === 'color' && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{
                                width: 40,
                                height: 40,
                                backgroundColor: newLayerColor,
                                border: '1px solid #fff'
                            }} />
                            <TextField
                                label="Цвет"
                                type="color"
                                value={newLayerColor}
                                onChange={(e) => setNewLayerColor(e.target.value)}
                                fullWidth
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setOpenLayerDialog(false)}
                        sx={{ color: '#aaa' }}
                    >
                        Отмена
                    </Button>
                    <Button
                        onClick={confirmAddLayer}
                        disabled={newLayerType === 'image' && !newLayerImage}
                        sx={{
                            backgroundColor: '#ff0000',
                            color: '#000',
                            '&:hover': {
                                backgroundColor: '#ff3333'
                            }
                        }}
                    >
                        Добавить
                    </Button>
                </DialogActions>
            </Dialog>

            <Drawer
                anchor="right"
                open={openMenu}
                onClose={toggleMenu}
                sx={{
                    '& .MuiDrawer-paper': {
                        width: '320px',
                        backgroundColor: '#111',
                        color: '#ff0000',
                        borderLeft: '3px solid #ff0000',
                    },
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2
                    }}>
                        <Typography variant="h6">
                            Инструменты
                        </Typography>
                        <IconButton
                            onClick={toggleMenu}
                            sx={{ color: '#ff0000' }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    <Tabs
                        value={menuTab}
                        onChange={(_, newValue) => setMenuTab(newValue)}
                        sx={{ mb: 2 }}
                    >
                        <Tab
                            value="settings"
                            label="Настройки"
                            icon={<SettingsIcon />}
                            sx={{ minWidth: 'auto' }}
                        />
                        <Tab
                            value="layers"
                            label="Слои"
                            icon={<LayersIcon />}
                            sx={{ minWidth: 'auto' }}
                        />
                    </Tabs>

                    {menuTab === 'settings' && (
                        <Box>
                            <Button
                                variant="contained"
                                startIcon={<ResizeIcon />}
                                onClick={() => {
                                    setOpenResizeModal(true);
                                    setOpenMenu(false);
                                }}
                                sx={{
                                    backgroundColor: '#ff0000',
                                    color: '#000',
                                    mt: 2,
                                    width: '100%',
                                    '&:hover': {
                                        backgroundColor: '#ff3333'
                                    }
                                }}
                            >
                                Изменить размер
                            </Button>

                            <Button
                                variant="contained"
                                startIcon={<TuneIcon />}
                                onClick={handleOpenCurvesDialog}
                                sx={{
                                    backgroundColor: '#ff0000',
                                    color: '#000',
                                    mt: 2,
                                    width: '100%',
                                    '&:hover': {
                                        backgroundColor: '#ff3333'
                                    }
                                }}
                            >
                                Кривые
                            </Button>

                            <Button
                                variant="contained"
                                startIcon={<TuneIcon />}
                                onClick={() => {
                                    handleOpenKernelDialog();
                                    setOpenMenu(false);
                                }}
                                sx={{
                                    backgroundColor: '#ff0000',
                                    color: '#000',
                                    mt: 2,
                                    width: '100%',
                                    '&:hover': {
                                        backgroundColor: '#ff3333'
                                    }
                                }}
                            >
                                Фильтр (Ядро)
                            </Button>

                            <Typography variant="body2" sx={{ color: '#aaa', mt: 4 }}>
                                Версия: 1.0.0
                            </Typography>
                        </Box>
                    )}

                    {menuTab === 'layers' &&
                        <LayersPanel
                            layers={layers}
                            activeLayerId={activeLayerId}
                            setActiveLayerId={setActiveLayerId}
                            removeLayer={removeLayer}
                            toggleLayerVisibility={toggleLayerVisibility}
                            changeLayerOpacity={changeLayerOpacity}
                            changeLayerBlendMode={changeLayerBlendMode}
                            moveLayer={moveLayer}
                            setOpenLayerDialog={setOpenLayerDialog}
                            onChangeScale={changeLayerScale}
                        />
                    }

                    <Button
                        variant="contained"
                        sx={{
                            backgroundColor: '#ff0000',
                            color: '#000',
                            mt: 3,
                            width: '100%',
                            '&:hover': {
                                backgroundColor: '#ff3333'
                            }
                        }}
                        onClick={toggleMenu}
                    >
                        Закрыть меню
                    </Button>
                </Box>
            </Drawer>
        </Box>
    );
}

export default App;