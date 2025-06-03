import { jsPDF } from 'jspdf';

export async function imagesToOriginalSizePdf(imageInstances: HTMLImageElement[], options = {
  unit: 'px', // Using pixels to match image dimensions
  compress: true // Compress PDF to reduce file size
}) {
  const doc = new jsPDF({
    unit: "px"
    // No format specified - pages will match image sizes
  });

  for (let i = 0; i < imageInstances.length; i++) {
    const img = imageInstances[i];
    
    try {
      // Create a page matching the image dimensions
      const width = img.width;
      const height = img.height;
      
      // For first page, we're already on it
        doc.addPage([width, height], img.width > img.height ? 'landscape' : 'portrait');
      
      // Add image at full size (0,0 coordinates)
      doc.addImage({
        imageData: img,
        x: 0,
        y: 0,
        width: width,
        height: height,
        compression: options.compress ? 'FAST' : 'NONE'
      });
      
    } catch (error) {
      console.error(`Error processing image ${i + 1}:`, error);
      continue;
    }
  }

  return doc.output('blob');
}


export default async function loadImageFromBlob(blobUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = blobUrl;
  });
}