import React from 'react';
import { 
  Box, Typography, Button, List, ListItem, ListItemButton, ListItemIcon, 
  ListItemText, IconButton, Slider, FormControl, InputLabel, Select, 
  MenuItem, Tooltip 
} from '@mui/material';
import { 
  Visibility as VisibilityIcon, 
  VisibilityOff as VisibilityOffIcon, 
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { blendModeDescriptions } from '../constants';
import { Layer } from '../types';


interface LayersPanelProps {
  layers: Layer[];
  activeLayerId: string | null;
  setActiveLayerId: (id: string) => void;
  removeLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  changeLayerOpacity: (id: string, opacity: number) => void;
  changeLayerBlendMode: (id: string, mode: 'normal' | 'multiply' | 'screen' | 'overlay') => void;
  moveLayer: (id: string, direction: 'up' | 'down') => void;
  setOpenLayerDialog: (open: boolean) => void;
  onChangeScale: (id: string, scale: number) => void; // Добавлено
}

const LayersPanel: React.FC<LayersPanelProps> = ({
  layers,
  activeLayerId,
  setActiveLayerId,
  removeLayer,
  toggleLayerVisibility,
  changeLayerOpacity,
  changeLayerBlendMode,
  moveLayer,
  setOpenLayerDialog,
  onChangeScale // Добавлено
}) => {
  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Слои</Typography>
        <Button 
          variant="contained" 
          size="small" 
          startIcon={<AddIcon />}
          onClick={() => setOpenLayerDialog(true)}
          disabled={layers.length >= 2}
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
      </Box>
      
      <List sx={{ maxHeight: 300, overflow: 'auto' }}>
        {[...layers].reverse().map((layer) => (
          <ListItem 
            key={layer.id} 
            disablePadding
            secondaryAction={
              <Box sx={{ display: 'flex', gap: 1 }}>
                {layer.id !== 'base-layer' && (
                  <>
                    <IconButton 
                      onClick={() => moveLayer(layer.id, 'up')}
                      disabled={layers.findIndex(l => l.id === layer.id) === layers.length - 1}
                    >
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      onClick={() => moveLayer(layer.id, 'down')}
                      disabled={layers.findIndex(l => l.id === layer.id) === 0}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
                <IconButton onClick={() => toggleLayerVisibility(layer.id)}>
                  {layer.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                </IconButton>
                {layer.id !== 'base-layer' && (
                  <IconButton onClick={() => removeLayer(layer.id)}>
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
            }
          >
            <ListItemButton
              selected={activeLayerId === layer.id}
              onClick={() => setActiveLayerId(layer.id)}
            >
              <ListItemIcon>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  backgroundImage: `url(${layer.thumbnail})`,
                  backgroundSize: 'cover',
                  border: '1px solid #444'
                }} />
              </ListItemIcon>
              <ListItemText 
                primary={layer.name} 
                secondary={
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ color: '#aaa' }}>
                      {layer.visible ? 'Видимый' : 'Скрытый'} | 
                      Непрозрачность: {Math.round(layer.opacity * 100)}%
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <Typography variant="body2" sx={{ color: '#aaa', mr: 1 }}>
                        Режим:
                      </Typography>
                      <Tooltip title={blendModeDescriptions[layer.blendMode]}>
                        <Typography variant="body2" sx={{ 
                          color: '#ff5555',
                          textDecoration: 'underline dotted',
                          cursor: 'help'
                        }}>
                          {layer.blendMode === 'normal' ? 'Обычный' : 
                            layer.blendMode === 'multiply' ? 'Умножение' : 
                            layer.blendMode === 'screen' ? 'Экран' : 
                            'Наложение'}
                        </Typography>
                      </Tooltip>
                    </Box>
                  </Box>
                }
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
          {activeLayerId && (
        <Box sx={{ mt: 2, p: 2, bgcolor: '#2a2a2a', borderRadius: 1 }}>
          <Typography variant="subtitle1" sx={{ color: '#ff0000', mb: 1 }}>
            Настройки слоя
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#aaa', mb: 1 }}>
              Масштаб
            </Typography>
            <Slider
              value={layers.find(l => l.id === activeLayerId)?.scale || 1}
              onChange={(_, value) => onChangeScale(activeLayerId, value as number)}
              min={0.1}
              max={3}
              step={0.01}
              sx={{ color: '#ff0000' }}
            />
            </Box>
          
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#aaa', mb: 1 }}>
              Непрозрачность
            </Typography>
            <Slider
              value={layers.find(l => l.id === activeLayerId)?.opacity || 1}
              onChange={(_, value) => changeLayerOpacity(activeLayerId, value as number)}
              min={0}
              max={1}
              step={0.01}
              sx={{ color: '#ff0000' }}
            />
          </Box>
          
          <FormControl fullWidth size="small">
            <InputLabel sx={{ color: '#aaa' }}>Режим наложения</InputLabel>
            <Select
              value={layers.find(l => l.id === activeLayerId)?.blendMode || 'normal'}
              onChange={(e) => changeLayerBlendMode(
                activeLayerId, 
                e.target.value as 'normal' | 'multiply' | 'screen' | 'overlay'
              )}
              label="Режим наложения"
              sx={{ 
                color: '#fff',
                '& .MuiSelect-icon': { color: '#aaa' }
              }}
            >
              <MenuItem value="normal">
                <Tooltip title={blendModeDescriptions.normal}>
                  <Box>Обычный</Box>
                </Tooltip>
              </MenuItem>
              <MenuItem value="multiply">
                <Tooltip title={blendModeDescriptions.multiply}>
                  <Box>Умножение</Box>
                </Tooltip>
              </MenuItem>
              <MenuItem value="screen">
                <Tooltip title={blendModeDescriptions.screen}>
                  <Box>Экран</Box>
                </Tooltip>
              </MenuItem>
              <MenuItem value="overlay">
                <Tooltip title={blendModeDescriptions.overlay}>
                  <Box>Наложение</Box>
                </Tooltip>
              </MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}
    </Box>
  );
};

export default LayersPanel;