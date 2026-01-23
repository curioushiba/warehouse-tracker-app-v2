"use client";

import * as React from "react";
import { Camera, CameraOff, RefreshCw, Check, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface CameraCaptureProps {
  /** Callback when a photo is captured */
  onCapture: (file: File) => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Whether an upload is in progress (shows loading on Use Photo button) */
  isUploading?: boolean;
  /** Custom class name for the container */
  className?: string;
}

type CameraState =
  | "initializing"
  | "ready"
  | "captured"
  | "error"
  | "permission_denied";

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onError,
  disabled = false,
  isUploading = false,
  className,
}) => {
  const [cameraState, setCameraState] =
    React.useState<CameraState>("initializing");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [capturedImageUrl, setCapturedImageUrl] = React.useState<string | null>(
    null
  );
  const [capturedFile, setCapturedFile] = React.useState<File | null>(null);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Stop and cleanup the media stream
  const stopCamera = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Start the camera
  const startCamera = React.useCallback(async () => {
    setCameraState("initializing");
    setErrorMessage(null);
    setCapturedImageUrl(null);
    setCapturedFile(null);

    // Stop any existing stream first
    stopCamera();

    // Check if mediaDevices API is available (requires secure context)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const isHttps = window.location.protocol === "https:";
      const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      let errorMsg: string;
      if (!isHttps && !isLocalhost) {
        errorMsg =
          "Camera requires HTTPS. Please access via localhost or use: npm run dev:https";
      } else {
        errorMsg = "Camera not supported in this browser.";
      }

      setCameraState("error");
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
      return;
    }

    try {
      // Request camera access with preference for back camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState("ready");
    } catch (err) {
      const error = err instanceof Error ? err.message : "Failed to start camera";

      // Check for permission errors
      if (
        error.toLowerCase().includes("permission") ||
        error.toLowerCase().includes("notallowed") ||
        (err instanceof DOMException && err.name === "NotAllowedError")
      ) {
        setCameraState("permission_denied");
        setErrorMessage(
          "Camera permission denied. Please allow camera access to take photos."
        );
      } else if (
        error.toLowerCase().includes("notfound") ||
        (err instanceof DOMException && err.name === "NotFoundError")
      ) {
        setCameraState("error");
        setErrorMessage("No camera found on this device.");
      } else {
        setCameraState("error");
        setErrorMessage(error);
      }

      onError?.(error);
    }
  }, [stopCamera, onError]);

  // Capture photo from video stream
  const capturePhoto = React.useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas size to match video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob and create file
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const fileName = `camera-capture-${Date.now()}.jpg`;
          const file = new File([blob], fileName, { type: "image/jpeg" });
          setCapturedFile(file);

          // Create preview URL
          const previewUrl = URL.createObjectURL(blob);
          setCapturedImageUrl(previewUrl);
          setCameraState("captured");

          // Pause video while showing preview
          video.pause();
        }
      },
      "image/jpeg",
      0.92 // Quality
    );
  }, []);

  // Handle retake - go back to camera view
  const handleRetake = React.useCallback(async () => {
    // Cleanup captured image URL
    if (capturedImageUrl) {
      URL.revokeObjectURL(capturedImageUrl);
    }
    setCapturedImageUrl(null);
    setCapturedFile(null);

    // Resume video stream
    if (videoRef.current && streamRef.current) {
      try {
        await videoRef.current.play();
        setCameraState("ready");
      } catch {
        // If play fails, restart the camera
        await startCamera();
      }
    } else {
      // Restart camera if stream was lost
      await startCamera();
    }
  }, [capturedImageUrl, startCamera]);

  // Handle use photo - call onCapture with the file
  const handleUsePhoto = React.useCallback(() => {
    if (capturedFile) {
      onCapture(capturedFile);
    }
  }, [capturedFile, onCapture]);

  // Initialize camera on mount and cleanup on unmount
  React.useEffect(() => {
    if (!disabled) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
    // Only run on mount/unmount and disabled change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  // Cleanup captured image URL on change or unmount
  React.useEffect(() => {
    const urlToRevoke = capturedImageUrl;
    return () => {
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [capturedImageUrl]);

  if (disabled) {
    return (
      <div
        className={cn(
          "relative aspect-video bg-neutral-900 rounded-lg flex items-center justify-center",
          className
        )}
      >
        <div className="text-center">
          <CameraOff className="w-12 h-12 text-white/30 mx-auto mb-2" />
          <p className="text-sm text-white/50">Camera disabled</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Hidden canvas for capturing frames */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Screen reader announcements */}
      <div aria-live="polite" className="sr-only">
        {cameraState === "initializing" && "Starting camera"}
        {cameraState === "ready" && "Camera ready. Point camera at item and press capture button."}
        {cameraState === "permission_denied" && "Camera access denied. Please enable camera permissions."}
        {cameraState === "error" && errorMessage}
        {cameraState === "captured" && !isUploading && "Photo captured. You can use this photo or retake."}
        {cameraState === "captured" && isUploading && "Uploading photo. Please wait."}
      </div>

      {/* Camera viewport container */}
      <div className="relative aspect-video bg-neutral-900 rounded-lg overflow-hidden">
        {/* Video element (always rendered but may be paused/hidden) */}
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label="Live camera preview"
          className={cn(
            "w-full h-full object-cover",
            cameraState === "captured" && "hidden"
          )}
        />

        {/* Captured image preview */}
        {cameraState === "captured" && capturedImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capturedImageUrl}
            alt="Captured photo preview"
            className="w-full h-full object-cover"
          />
        )}

        {/* State overlays */}
        {cameraState === "initializing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900">
            <div className="animate-pulse">
              <Camera className="w-16 h-16 text-white/50" />
            </div>
            <p className="mt-4 text-sm text-white/60">Starting camera...</p>
          </div>
        )}

        {cameraState === "permission_denied" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 p-6">
            <CameraOff className="w-16 h-16 text-error mb-4" />
            <p className="text-sm text-white text-center mb-2">
              Camera access denied
            </p>
            <p className="text-xs text-white/60 text-center mb-6">
              Please enable camera permissions in your browser settings to take
              photos.
            </p>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={startCamera}
            >
              Try Again
            </Button>
          </div>
        )}

        {cameraState === "error" && errorMessage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 p-6">
            <CameraOff className="w-16 h-16 text-error mb-4" />
            <p className="text-sm text-white text-center mb-4">{errorMessage}</p>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={startCamera}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Ready state overlay with capture button */}
        {cameraState === "ready" && (
          <>
            {/* Instructions */}
            <div className="absolute top-4 inset-x-4">
              <div className="bg-black/70 rounded-xl px-4 py-2 text-center">
                <p className="text-white text-sm">Point camera at item</p>
              </div>
            </div>

            {/* Capture button */}
            <div className="absolute bottom-4 inset-x-0 flex justify-center">
              <button
                type="button"
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-white border-4 border-white/50 shadow-lg hover:scale-105 active:scale-95 transition-transform focus:outline-none focus:ring-4 focus:ring-primary/50"
                aria-label="Capture photo"
              >
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <Camera className="w-6 h-6 text-neutral-700" />
                </div>
              </button>
            </div>
          </>
        )}

        {/* Captured state overlay with retake/use buttons */}
        {cameraState === "captured" && (
          <div className="absolute bottom-4 inset-x-4 flex justify-center gap-3">
            <Button
              variant="secondary"
              leftIcon={<RotateCcw className="w-4 h-4" />}
              onClick={handleRetake}
              disabled={isUploading}
              className="bg-black/70 text-white border-white/30 hover:bg-black/80 disabled:opacity-50"
            >
              Retake
            </Button>
            <Button
              variant="primary"
              leftIcon={isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              onClick={handleUsePhoto}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Use Photo"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
