/// <reference types="webworker" />

const loadConvolution = async () => {
    const { applyConvolution } = await import('../utils/convolution');
    return applyConvolution;
};

self.onmessage = async (e) => {
    const { imageData, kernel } = e.data;
    
    try {
        const applyConvolution = await loadConvolution();
        const result = applyConvolution(imageData, kernel);
        self.postMessage(result);
    } catch (error) {
        console.error('Error in convolution worker:', error);
        self.postMessage(null);
    }
};