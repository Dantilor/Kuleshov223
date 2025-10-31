export const calculateHistogram = (imageData: ImageData) => {
  const hist = {
    r: new Array(256).fill(0),
    g: new Array(256).fill(0),
    b: new Array(256).fill(0),
    a: new Array(256).fill(0)
  };

  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    hist.r[data[i]]++;
    hist.g[data[i+1]]++;
    hist.b[data[i+2]]++;
    hist.a[data[i+3]]++;
  }
  
  return hist;
};