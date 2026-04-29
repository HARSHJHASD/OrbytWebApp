import { Check, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';

interface Point {
    x: number;
    y: number;
}
interface Area {
    width: number;
    height: number;
    x: number;
    y: number;
}

interface ImageCropperModalProps {
    isOpen: boolean;
    imageSrc: string | null;
    aspect: number;
    onClose: () => void;
    onCropComplete: (croppedImageBlob: Blob) => void;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.src = url;
    });

export default function ImageCropperModal({
    isOpen,
    imageSrc,
    aspect,
    onClose,
    onCropComplete
}: ImageCropperModalProps) {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const onCropChange = useCallback((newCrop: Point) => {
        setCrop(newCrop);
    }, []);

    const onZoomChange = useCallback((newZoom: number) => {
        setZoom(newZoom);
    }, []);

    const handleCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleConfirm = async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        try {
            const image = await createImage(imageSrc);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) return;

            // Set canvas size to match the cropped area
            canvas.width = croppedAreaPixels.width;
            canvas.height = croppedAreaPixels.height;

            // Draw the cropped image onto the canvas
            ctx.drawImage(
                image,
                croppedAreaPixels.x,
                croppedAreaPixels.y,
                croppedAreaPixels.width,
                croppedAreaPixels.height,
                0,
                0,
                croppedAreaPixels.width,
                croppedAreaPixels.height
            );

            // Convert canvas to blob
            canvas.toBlob((blob) => {
                if (blob) {
                    onCropComplete(blob);
                }
            }, 'image/jpeg', 0.95);

        } catch (e) {
            console.error("Error cropping image", e);
        }
    };

    if (!isOpen || !imageSrc) return null;

    return (
        <div className="fixed inset-0 z-[3000] flex flex-col bg-black">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-slate-900/80 backdrop-blur-md z-10 safe-top">
                <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
                <div className="text-white font-bold">Crop</div>
                <button
                    onClick={handleConfirm}
                    className="px-4 py-1.5 bg-primary-500 text-white text-sm font-bold rounded-full hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/20"
                >
                    Done
                </button>
            </div>

            {/* Cropper Container */}
            <div className="relative flex-1 bg-black">
                <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={aspect}
                    onCropChange={onCropChange}
                    onZoomChange={onZoomChange}
                    onCropComplete={handleCropComplete}
                    objectFit="contain"
                    showGrid={true}
                />
            </div>

            {/* Controls */}
            <div className="p-6 bg-slate-900 safe-bottom">
                <div className="flex flex-col gap-2 max-w-sm mx-auto">
                    <label className="text-xs font-bold text-slate-400 text-center uppercase tracking-wider">Zoom Level</label>
                    <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.1}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                    />
                </div>
            </div>
        </div>
    );
}
