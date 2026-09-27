import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, RefreshCw, FlipHorizontal, AlertCircle, Smartphone, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { UploadedGarmentPhoto } from '../types/inspection';
import { resizeImageToMax1600 } from '../utils/imageUtils';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photo: UploadedGarmentPhoto) => void;
  onFallbackToGallery?: () => void;
  onUseNativeCamera?: () => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  onFallbackToGallery,
  onUseNativeCamera,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isIframeBlocked, setIsIframeBlocked] = useState(false);

  // Default facing mode: user (front webcam) on computers, environment (rear camera) on mobile
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(() => {
    if (typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent || '')) {
      return 'environment';
    }
    return 'user';
  });

  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Stop current active media stream & release hardware webcam
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // Check if multiple camera devices exist
  const checkAvailableCameras = useCallback(async () => {
    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      }
    } catch (_) {}
  }, []);

  // Robust stream acquirer: tries ideal constraints first, then falls back to basic video
  const acquireStream = async (mode: 'environment' | 'user'): Promise<MediaStream> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera access (getUserMedia) is not supported by this browser.');
    }

    const attempts: MediaStreamConstraints[] = [
      // 1. Ideal requested lens without restrictive resolution locks
      {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
      // 2. Simple facingMode
      {
        video: {
          facingMode: { ideal: mode },
        },
        audio: false,
      },
      // 3. Pure video: true (universal fallback for laptops, desktops, webcams)
      {
        video: true,
        audio: false,
      },
    ];

    let lastError: any = null;
    for (const constraints of attempts) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        return mediaStream;
      } catch (err: any) {
        lastError = err;
        console.warn('Camera attempt failed with constraints:', constraints, err);
      }
    }

    throw lastError || new Error('Could not access camera feed.');
  };

  // Start the camera
  const startCamera = useCallback(
    async (mode: 'environment' | 'user') => {
      setIsLoading(true);
      setErrorMessage(null);
      setIsIframeBlocked(false);

      // Clean up previous stream
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }

      try {
        const newStream = await acquireStream(mode);
        setStream(newStream);

        // Check if inside an iframe
        const inIframe = typeof window !== 'undefined' && window.self !== window.top;
        setIsIframeBlocked(false);

        await checkAvailableCameras();
      } catch (err: any) {
        console.error('Camera startup error:', err);
        const inIframe = typeof window !== 'undefined' && window.self !== window.top;

        let msg = 'Could not access camera.';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
          if (inIframe) {
            setIsIframeBlocked(true);
            msg = 'Camera access is restricted inside the preview frame. Open in a direct window or use your device camera.';
          } else {
            msg = 'Camera permission was not granted by your browser. Please ensure your browser has camera access enabled in site settings.';
          }
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = 'No camera device found on this system.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          msg = 'Camera is in use by another application or browser tab. Please close other camera apps and retry.';
        } else if (err.message) {
          msg = err.message;
        }

        setErrorMessage(msg);
        setIsLoading(false);
      }
    },
    [stream, checkAvailableCameras]
  );

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen, facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bind stream to video element whenever stream changes or videoRef is mounted
  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.autoplay = true;

      video.srcObject = stream;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsLoading(false);
          })
          .catch((err) => {
            console.warn('Video auto-play suppressed:', err);
            // Even if autoplay was suppressed, loading state should clear so user can tap
            setIsLoading(false);
          });
      }

      // Safety timeout: if track is live, clear loading after 500ms
      const timeoutId = setTimeout(() => {
        const tracks = stream.getVideoTracks();
        if (tracks.length > 0 && tracks[0].readyState === 'live') {
          setIsLoading(false);
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [stream]);

  // Flip between front and rear cameras
  const handleToggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Capture frame
  const handleTakePhoto = async () => {
    if (!videoRef.current || isCapturing) return;

    try {
      setIsCapturing(true);

      const video = videoRef.current;
      const width = video.videoWidth || video.clientWidth || 1280;
      const height = video.videoHeight || video.clientHeight || 720;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas rendering context unavailable');
      }

      // Mirror front camera so output matches preview
      if (facingMode === 'user') {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.92);
      });

      if (!blob) {
        throw new Error('Failed to capture image data');
      }

      const photo = await resizeImageToMax1600(blob);
      stopStream();
      onCapture(photo);
      onClose();
    } catch (err: any) {
      console.error('Error capturing photo:', err);
      setErrorMessage(err.message || 'Failed to capture photo.');
    } finally {
      setIsCapturing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Camera Viewfinder"
    >
      {/* Top Controls Bar */}
      <div className="relative z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex-shrink-0">
        <button
          type="button"
          onClick={() => {
            stopStream();
            onClose();
          }}
          className="min-h-[48px] min-w-[48px] rounded-full bg-black/50 text-white hover:bg-black/70 flex items-center justify-center transition backdrop-blur-xs"
          aria-label="Close camera"
        >
          <X className="w-6 h-6 stroke-[2.2]" />
        </button>

        <span className="text-white text-[14px] font-semibold tracking-wide bg-black/50 px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-xs">
          Take Garment Photo
        </span>

        {/* Flip Camera button */}
        <button
          type="button"
          onClick={handleToggleCamera}
          disabled={isLoading || Boolean(errorMessage)}
          className="min-h-[48px] min-w-[48px] rounded-full bg-black/50 text-white hover:bg-black/70 flex items-center justify-center transition backdrop-blur-xs active:scale-95 disabled:opacity-40"
          title="Switch camera lens"
          aria-label="Switch camera lens"
        >
          <FlipHorizontal className="w-5 h-5 stroke-[2.2]" />
        </button>
      </div>

      {/* Main Viewfinder Area - using flex-1 min-h-0 to prevent flexbox overflow */}
      <div
        className="relative flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden bg-black cursor-pointer"
        onClick={() => {
          if (videoRef.current?.paused) {
            videoRef.current.play().catch(() => {});
          }
        }}
      >
        {/* Live Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={() => setIsLoading(false)}
          onPlaying={() => setIsLoading(false)}
          onCanPlay={() => setIsLoading(false)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            facingMode === 'user' ? 'scale-x-[-1]' : ''
          } ${errorMessage ? 'opacity-0' : 'opacity-100'}`}
        />

        {/* Framing Guidelines */}
        {!errorMessage && !isLoading && (
          <div className="absolute inset-8 sm:inset-12 pointer-events-none flex flex-col justify-between items-center z-10">
            <div className="w-full flex justify-between">
              <div className="w-8 h-8 border-t-3 border-l-3 border-white/80 rounded-tl-lg shadow-sm" />
              <div className="w-8 h-8 border-t-3 border-r-3 border-white/80 rounded-tr-lg shadow-sm" />
            </div>

            <div className="px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-xs border border-white/20 text-white text-[13px] font-medium text-center shadow-md">
              Center garment or defect in frame
            </div>

            <div className="w-full flex justify-between">
              <div className="w-8 h-8 border-b-3 border-l-3 border-white/80 rounded-bl-lg shadow-sm" />
              <div className="w-8 h-8 border-b-3 border-r-3 border-white/80 rounded-br-lg shadow-sm" />
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && !errorMessage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-white space-y-3 bg-black/75">
            <RefreshCw className="w-8 h-8 animate-spin text-[#2F6FED]" />
            <p className="text-[15px] font-semibold text-white">Opening camera feed…</p>
            <p className="text-[13px] text-white/70 max-w-xs text-center px-4">
              Starting camera stream on this device…
            </p>
          </div>
        )}

        {/* Error / Fallback Screen */}
        {errorMessage && (
          <div className="absolute inset-4 max-w-sm mx-auto my-auto h-fit bg-[#FFFFFF] rounded-[12px] p-6 text-[#0F1B2D] border border-[#DCE3EB] shadow-2xl z-30 space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FDECEC] text-[#E5484D] flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-[18px] font-semibold text-[#0F1B2D]">
                Camera Feed Notice
              </h3>
              <p className="text-[14px] text-[#5B6B7F] leading-snug">
                {errorMessage}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              {/* Option A: Direct Window if in iframe */}
              {isIframeBlocked && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[48px] h-[48px] rounded-[12px] bg-[#2F6FED] hover:bg-[#255bc2] text-white font-semibold text-[14px] flex items-center justify-center gap-2 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open in Direct Window</span>
                </a>
              )}

              {/* Option B: Device Camera App */}
              {onUseNativeCamera && (
                <button
                  type="button"
                  onClick={() => {
                    stopStream();
                    onClose();
                    onUseNativeCamera();
                  }}
                  className="w-full min-h-[48px] h-[48px] rounded-[12px] bg-[#0F2A44] hover:bg-[#1a3f65] text-white font-semibold text-[14px] flex items-center justify-center gap-2 transition"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Take Photo with Device Camera</span>
                </button>
              )}

              {/* Option C: Gallery / File Upload */}
              {onFallbackToGallery && (
                <button
                  type="button"
                  onClick={() => {
                    stopStream();
                    onClose();
                    onFallbackToGallery();
                  }}
                  className="w-full min-h-[48px] h-[48px] rounded-[12px] bg-[#FFFFFF] hover:bg-[#F5F8FB] border border-[#DCE3EB] text-[#0F1B2D] font-semibold text-[14px] flex items-center justify-center gap-2 transition"
                >
                  <ImageIcon className="w-4 h-4 text-[#5B6B7F]" />
                  <span>Choose from Gallery / Files</span>
                </button>
              )}

              {/* Option D: Retry Stream */}
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="w-full min-h-[48px] py-2 text-[#5B6B7F] hover:text-[#0F1B2D] text-[13px] font-medium flex items-center justify-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Live Webcam Again</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopStream();
                  onClose();
                }}
                className="w-full min-h-[48px] py-2 text-[#5B6B7F] hover:text-[#0F1B2D] text-[13px] font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Shutter Action Bar */}
      <div className="relative z-20 p-6 pb-8 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex items-center justify-between max-w-md mx-auto w-full flex-shrink-0">
        {onUseNativeCamera ? (
          <button
            type="button"
            onClick={() => {
              stopStream();
              onClose();
              onUseNativeCamera();
            }}
            className="min-h-[48px] px-3 py-2 rounded-[8px] bg-white/10 hover:bg-white/20 text-white text-[12px] font-medium flex items-center gap-1.5 transition active:scale-95"
            title="Use device camera app"
          >
            <Smartphone className="w-4 h-4 text-white" />
            <span>Device App</span>
          </button>
        ) : (
          <div className="w-16" />
        )}

        {/* Large Shutter Button */}
        <button
          type="button"
          disabled={isLoading || Boolean(errorMessage) || isCapturing}
          onClick={handleTakePhoto}
          className="relative w-20 h-20 min-h-[56px] min-w-[56px] rounded-full border-4 border-white flex items-center justify-center p-1.5 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed group shadow-2xl"
          aria-label="Capture photo"
        >
          <div className="w-full h-full rounded-full bg-white group-hover:bg-[#F5F8FB] transition-colors flex items-center justify-center">
            {isCapturing ? (
              <RefreshCw className="w-6 h-6 animate-spin text-[#0F2A44]" />
            ) : (
              <Camera className="w-7 h-7 text-[#0F2A44]" />
            )}
          </div>
        </button>

        {/* Mode or switch lens button */}
        <div className="w-16 flex justify-end">
          <button
            type="button"
            onClick={handleToggleCamera}
            disabled={isLoading || Boolean(errorMessage)}
            className="text-white/80 text-[11px] font-mono uppercase bg-black/40 px-2 py-1 rounded-[4px] border border-white/20 hover:bg-black/60 transition"
          >
            {facingMode === 'environment' ? 'Rear' : 'Front'}
          </button>
        </div>
      </div>
    </div>
  );
};
