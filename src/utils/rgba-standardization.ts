// Using Canvas to standardize to RGBA
export default function imageToRGBA(uint8Array: Uint8Array): Promise<{
  arrayInstance: Uint8Array, imageInstance: HTMLImageElement }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      resolve({ arrayInstance:  new Uint8Array(imageData.data.buffer), imageInstance: img });
    };
    img.src = URL.createObjectURL(new Blob([uint8Array]));
  });
}