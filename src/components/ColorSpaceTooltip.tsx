import React from 'react';
import { Box, Typography } from '@mui/material';

interface ColorSpaceTooltipProps {
  space: string;
}

const ColorSpaceTooltip: React.FC<ColorSpaceTooltipProps> = ({ space }) => {
  const info: Record<string, { axes: string[]; description: string }> = {
    RGB: {
      axes: ['R: Red (0-255)', 'G: Green (0-255)', 'B: Blue (0-255)'],
      description: 'Additive color model for digital displays'
    },
    XYZ: {
      axes: ['X: Mixed cones response', 'Y: Luminance', 'Z: Blue stimulation'],
      description: 'CIE 1931 color space based on human perception'
    },
    Lab: {
      axes: ['L: Lightness (0-100)', 'a: Green-Red axis (-128-127)', 'b: Blue-Yellow axis (-128-127)'],
      description: 'Perceptually uniform color space'
    },
    OKLCH: {
      axes: ['L: Perceived lightness (0-1)', 'C: Chroma (0-0.4)', 'H: Hue (0-360)'],
      description: 'Improved perceptual model with polar coordinates'
    }
  };
  
  const { axes, description } = info[space] || { axes: [], description: '' };
  
  return (
    <Box sx={{ p: 1, maxWidth: 300 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{space} Color Space</Typography>
      <Typography variant="body2" sx={{ mt: 1 }}>{description}</Typography>
      <Box sx={{ mt: 1.5 }}>
        {axes.map((axis, i) => (
          <Typography key={i} variant="body2" sx={{ mt: 0.5 }}>{axis}</Typography>
        ))}
      </Box>
    </Box>
  );
};

export default ColorSpaceTooltip;