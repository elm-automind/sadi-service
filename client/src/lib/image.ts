const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.75;

export interface ProcessedImage {
  previewUrl: string;
  dataUri: string;
  originalName: string;
}

export async function processImage(file: File): Promise<ProcessedImage> {
  const previewUrl = URL.createObjectURL(file);
  
  const dataUri = await compressImage(file);
  
  return {
    previewUrl,
    dataUri,
    originalName: file.name,
  };
}

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        let { width, height } = img;
        
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUri = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        
        URL.revokeObjectURL(img.src);
        
        resolve(dataUri);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

export function revokePreviewUrl(url: string): void {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
