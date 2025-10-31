import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import ColorSpaceTooltip from './ColorSpaceTooltip';

interface ColorSpaceInfoProps {
  space: string;
  values: string[];
}

const ColorSpaceInfo: React.FC<ColorSpaceInfoProps> = ({ space, values }) => (
  <Box sx={{ mt: 1 }}>
    <Tooltip title={<ColorSpaceTooltip space={space} />}>
      <Typography variant="body2" sx={{ 
          color: '#ff5555', 
          textDecoration: 'underline dotted',
          cursor: 'help',
          fontWeight: 'bold'
        }}>
        {space}
      </Typography>
    </Tooltip>
    {values.map((v, i) => (
      <Typography key={i} variant="body2" sx={{ color: '#aaa', ml: 1 }}>
        {v}
      </Typography>
    ))}
  </Box>
);

export default ColorSpaceInfo;