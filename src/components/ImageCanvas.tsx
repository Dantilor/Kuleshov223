import  { forwardRef } from 'react';

interface ImageCanvasProps {
  visible: boolean;
}

const ImageCanvas = forwardRef<HTMLCanvasElement, ImageCanvasProps>(({ visible }, ref) => {
  return (
    <canvas 
      ref={ref} 
      style={{ 
        display: visible ? 'block' : 'none',
        cursor: 'default'
      }}
    />
  );
});



export default ImageCanvas;