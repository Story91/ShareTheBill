"use client";

import { useState, useRef, useEffect } from "react";
import { Button, Icon } from "./DemoComponents";

interface NewCameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function NewCameraCapture({ onCapture, onClose }: NewCameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Start camera when component mounts
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setIsLoading(true);
    setError("");
    setVideoReady(false);
    
    try {
      console.log("Requesting camera access...");
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // prefer back camera
        }
      });

      console.log("Camera stream obtained:", mediaStream);
      setStream(mediaStream);

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        
        // Force video to play immediately when stream is ready
        video.onloadedmetadata = async () => {
          console.log("Video metadata loaded, starting playback");
          try {
            await video.play();
            setVideoReady(true);
            console.log("Video is now playing");
          } catch (playError) {
            console.error("Play failed:", playError);
          }
        };
        
        // Fallback: try to play after a short delay even without metadata
        setTimeout(async () => {
          if (video.paused) {
            console.log("Fallback: attempting to play video");
            try {
              await video.play();
              setVideoReady(true);
            } catch (err) {
              console.error("Fallback play failed:", err);
            }
          }
        }, 500);
        
        console.log("Video source set");
      }
      
    } catch (err) {
      console.error("Camera error:", err);
      setError("Unable to access camera. Please check permissions.");
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      console.log("Stopping camera...");
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !stream) {
      console.error("Video or canvas not ready");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      console.error("Cannot get canvas context");
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    console.log(`Capturing photo: ${canvas.width}x${canvas.height}`);

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to file
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `receipt-${Date.now()}.jpg`, { 
          type: 'image/jpeg' 
        });
        console.log("Photo captured:", file);
        onCapture(file);
        stopCamera();
        onClose();
      } else {
        console.error("Failed to create blob from canvas");
      }
    }, 'image/jpeg', 0.8);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Take Receipt Photo</h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <Icon name="plus" className="rotate-45" size="sm" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {(isLoading || (stream && !videoReady)) && (
            <div className="text-center py-8">
              <div className="animate-pulse">
                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">
                  {isLoading ? "Starting camera..." : "Initializing video..."}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <div className="text-red-500 mb-4">{error}</div>
              <Button
                variant="primary"
                onClick={startCamera}
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          )}

          {stream && videoReady && !error && (
            <>
              {/* Video Preview */}
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                  style={{ transform: 'scaleX(-1)' }} // Mirror for selfie effect
                />
              </div>

              {/* Controls */}
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={capturePhoto}
                  className="flex-1"
                >
                  <Icon name="camera" size="sm" className="mr-2" />
                  Capture
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
