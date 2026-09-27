import React, { useRef, useState } from 'react';
import {
  Camera,
  Image as ImageIcon,
  X,
  Plus,
  RefreshCw,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { UploadedGarmentPhoto } from '../types/inspection';
import { PhotoWithBoxes } from './PhotoWithBoxes';
import { CameraModal } from './CameraModal';
import { resizeImageToMax1600 } from '../utils/imageUtils';

interface InspectScreenProps {
  photos: UploadedGarmentPhoto[];
  onAddPhoto: (photo: UploadedGarmentPhoto) => void;
  onRemovePhoto: (id: string) => void;
  onInspect: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

export const InspectScreen: React.FC<InspectScreenProps> = ({
  photos,
  onAddPhoto,
  onRemovePhoto,
  onInspect,
  isLoading,
  errorMessage,
  onClearError,
}) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const availableSlots = 3 - photos.length;
    const filesToProcess = Array.from(files).slice(0, availableSlots);

    for (const file of filesToProcess) {
      try {
        const resized = await resizeImageToMax1600(file);
        onAddPhoto(resized);
      } catch (err) {
        console.error('Error processing image:', err);
      }
    }

    e.target.value = '';
  };

  const handleOpenLiveCamera = () => {
    if (photos.length >= 3 || isLoading) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }
    setIsCameraOpen(true);
  };

  return (
    <div className="space-y-4 pb-28 animate-in fade-in duration-150">
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Main photo area */}
      {photos.length > 0 ? (
        <div className="space-y-3">
          <div className="relative">
            <PhotoWithBoxes
              photoUrl={photos[0].dataUrl}
              imageIndex={0}
              defects={[]}
              isScanning={isLoading}
            />
            {photos.length > 1 && (
              <span className="absolute bottom-3 right-3 bg-[#FFFFFF] px-2.5 py-1 rounded-[8px] text-[13px] font-medium text-[#0F1B2D] border border-[#DCE3EB]">
                1 of {photos.length} photos
              </span>
            )}
          </div>

          {/* Thumbnails row */}
          <div className="flex items-center gap-3 overflow-x-auto py-1">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="relative w-20 h-20 rounded-[12px] overflow-hidden bg-[#FFFFFF] border border-[#DCE3EB] flex-shrink-0"
              >
                <img
                  src={photo.dataUrl}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 bg-[#0F2A44]/80 text-white text-[11px] font-mono px-1 rounded-[4px]">
                  #{index + 1}
                </span>
                {!isLoading && (
                  <button
                    type="button"
                    onClick={() => onRemovePhoto(photo.id)}
                    className="min-h-[48px] min-w-[48px] absolute -top-2 -right-2 flex items-center justify-center text-[#E5484D] active:scale-95"
                    aria-label={`Remove photo ${index + 1}`}
                  >
                    <span className="w-5 h-5 rounded-full bg-[#E5484D] text-white flex items-center justify-center">
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    </span>
                  </button>
                )}
              </div>
            ))}

            {photos.length < 3 && !isLoading && (
              <button
                type="button"
                onClick={handleOpenLiveCamera}
                className="min-h-[48px] w-20 h-20 rounded-[12px] border-2 border-dashed border-[#DCE3EB] hover:border-[#2F6FED] bg-[#FFFFFF] text-[#5B6B7F] hover:text-[#2F6FED] flex flex-col items-center justify-center flex-shrink-0 transition"
              >
                <Plus className="w-5 h-5 mb-0.5" />
                <span className="text-[11px] font-medium">Add Photo</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Empty photo placeholder card */
        <div className="bg-[#FFFFFF] border border-[#DCE3EB] rounded-[12px] p-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-[12px] bg-[#F5F8FB] border border-[#DCE3EB] flex items-center justify-center text-[#0F2A44] mb-3">
            <Camera className="w-7 h-7" />
          </div>
          <h2 className="text-[18px] font-semibold text-[#0F1B2D] mb-1">
            Capture or Upload Garment
          </h2>
          <p className="text-[15px] text-[#5B6B7F] max-w-xs mx-auto">
            Take clear photos of the garment fabric, seams, or defect area. Up to 3 photos allowed.
          </p>
        </div>
      )}

      {/* Photo Capture Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={isLoading || photos.length >= 3}
          onClick={handleOpenLiveCamera}
          className="min-h-[48px] h-[52px] rounded-[12px] bg-[#FFFFFF] hover:bg-[#F5F8FB] border border-[#DCE3EB] disabled:opacity-40 disabled:pointer-events-none text-[#0F1B2D] font-semibold text-[15px] flex items-center justify-center gap-2 active:bg-[#E9F0F8] transition"
        >
          <Camera className="w-5 h-5 text-[#0F2A44]" />
          <span>Take Photo</span>
        </button>

        <button
          type="button"
          disabled={isLoading || photos.length >= 3}
          onClick={() => galleryInputRef.current?.click()}
          className="min-h-[48px] h-[52px] rounded-[12px] bg-[#FFFFFF] hover:bg-[#F5F8FB] border border-[#DCE3EB] disabled:opacity-40 disabled:pointer-events-none text-[#0F1B2D] font-semibold text-[15px] flex items-center justify-center gap-2 active:bg-[#E9F0F8] transition"
        >
          <ImageIcon className="w-5 h-5 text-[#0F2A44]" />
          <span>From Gallery</span>
        </button>
      </div>

      {/* Error notification card */}
      {errorMessage && (
        <div className="p-4 rounded-[12px] bg-[#FDECEC] border border-[#E5484D] text-[#E5484D] space-y-2">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-[#E5484D] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-[#E5484D]">Inspection Error</h3>
              <p className="text-[13px] mt-0.5 text-[#0F1B2D]">{errorMessage}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClearError}
              className="min-h-[48px] px-4 py-2 rounded-[8px] bg-white border border-[#DCE3EB] text-[#0F1B2D] font-medium text-[13px] transition"
            >
              Dismiss
            </button>
            <button
              onClick={onInspect}
              className="min-h-[48px] px-4 py-2 rounded-[8px] bg-[#E5484D] text-white font-semibold text-[13px] flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try again</span>
            </button>
          </div>
        </div>
      )}

      {/* Fixed bottom primary action button container */}
      <div className="fixed bottom-[64px] left-0 right-0 z-30 bg-[#F5F8FB]/90 backdrop-blur-xs border-t border-[#DCE3EB] p-4">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            disabled={photos.length === 0 || isLoading}
            onClick={onInspect}
            className="w-full h-[56px] min-h-[56px] rounded-[12px] bg-[#0F2A44] hover:bg-[#1a3f65] active:bg-[#091b2c] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-[16px] tracking-wide flex items-center justify-center gap-2 transition"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-white" />
                <span>Inspecting garment…</span>
              </>
            ) : (
              <>
                <span>Inspect Garment</span>
                <ArrowRight className="w-5 h-5 stroke-[2.2]" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Camera Viewfinder Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={onAddPhoto}
        onFallbackToGallery={() => galleryInputRef.current?.click()}
        onUseNativeCamera={() => cameraInputRef.current?.click()}
      />
    </div>
  );
};
