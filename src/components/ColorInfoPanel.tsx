import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import ColorSpaceInfo from './ColorSpaceInfo';
import { ColorData } from '../types';

interface ColorInfoPanelProps {
  showColorPanel: boolean;
  primaryColor: ColorData | null;
  secondaryColor: ColorData | null;
  contrastValue: number | null;
  contrastWarning: boolean;
}

const ColorInfoPanel: React.FC<ColorInfoPanelProps> = ({ 
  showColorPanel, 
  primaryColor, 
  secondaryColor, 
  contrastValue, 
  contrastWarning 
}) => {
  if (!showColorPanel) return null;
  
  const renderColorInfo = (color: ColorData | null, title: string) => (
    <Box sx={{ p: 2, bgcolor: '#2a2a2a', borderRadius: 1, mb: 2 }}>
      <Typography variant="subtitle1" sx={{ color: '#ff0000', mb: 1 }}>
        {title}
      </Typography>
      
      {color ? (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box sx={{
                width: 40,
                height: 40,
                bgcolor: color.hex,
                border: '1px solid #fff',
                mr: 2
            }} />
            <Typography variant="body2" sx={{ color: '#aaa' }}>
              Position: {color.position.x}, {color.position.y}
            </Typography>
          </Box>
          
          <ColorSpaceInfo space="RGB" values={[
            `R: ${color.rgb.r}`,
            `G: ${color.rgb.g}`,
            `B: ${color.rgb.b}`
          ]} />
          
          <ColorSpaceInfo space="XYZ" values={[
            `X: ${color.xyz.x.toFixed(2)}`,
            `Y: ${color.xyz.y.toFixed(2)}`,
            `Z: ${color.xyz.z.toFixed(2)}`
          ]} />
          
          <ColorSpaceInfo space="Lab" values={[
            `L: ${color.lab.l.toFixed(2)}`,
            `a: ${color.lab.a.toFixed(2)}`,
            `b: ${color.lab.b.toFixed(2)}`
          ]} />
          
          <ColorSpaceInfo space="OKLCH" values={[
            `L: ${color.oklch.l.toFixed(2)}`,
            `C: ${color.oklch.c.toFixed(2)}`,
            `H: ${color.oklch.h.toFixed(2)}`
          ]} />
        </>
      ) : (
        <Typography variant="body2" sx={{ color: '#aaa' }}>
          {title === 'Primary Color' 
            ? 'Click to select primary color' 
            : 'Alt+Click to select secondary color'}
        </Typography>
      )}
    </Box>
  );
  
  return (
    <Paper sx={{ 
        position: 'absolute', 
        bottom: 16, 
        left: 16, 
        width: 300, 
        zIndex: 100,
        bgcolor: '#1e1e1e'
    }}>
      {renderColorInfo(primaryColor, 'Primary Color')}
      {renderColorInfo(secondaryColor, 'Secondary Color')}
      
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ color: '#ff0000', mb: 1 }}>
          Contrast
        </Typography>
        
        {contrastValue !== null ? (
          <>
            <Typography variant="body1" sx={{ 
                color: contrastWarning ? '#ff5555' : '#55ff55',
                fontWeight: 'bold'
            }}>
              WCAG 2.0: {contrastValue.toFixed(2)}:1
            </Typography>
            {contrastWarning && (
              <Typography variant="body2" sx={{ color: '#ff5555', mt: 1 }}>
                Warning: Contrast is below 4.5:1
              </Typography>
            )}
          </>
        ) : (
          <Typography variant="body2" sx={{ color: '#aaa' }}>
            Select two colors to see contrast ratio
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default ColorInfoPanel;