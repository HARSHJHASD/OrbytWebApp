/**
 * Simple image compression utility
 */
export const compressImage = (
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.8,
  targetAspectRatio?: number // Width / Height
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate dimensions after potential crop
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = width;
        let sourceHeight = height;

        if (targetAspectRatio) {
          const currentAspectRatio = width / height;
          if (currentAspectRatio > targetAspectRatio) {
            // Wider than target - crop sides
            sourceWidth = height * targetAspectRatio;
            sourceX = (width - sourceWidth) / 2;
          } else if (currentAspectRatio < targetAspectRatio) {
            // Taller than target - crop top/bottom
            sourceHeight = width / targetAspectRatio;
            sourceY = (height - sourceHeight) / 2;
          }
        }

        // Apply maxWidth scaling after crop
        let outputWidth = sourceWidth;
        let outputHeight = sourceHeight;

        if (outputWidth > maxWidth) {
          outputHeight = Math.round((outputHeight * maxWidth) / outputWidth);
          outputWidth = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = outputWidth;
        canvas.height = outputHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          outputWidth,
          outputHeight
        );

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };

      img.onerror = () => reject(new Error("Image load failed"));
    };

    reader.onerror = () => reject(new Error("File read failed"));
  });
};
