"use client";

import { useRef } from "react";

interface SimpleCameraProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function SimpleCamera({ onCapture, onClose }: SimpleCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      alert("Camera access denied or not available");
      onClose();
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
          onCapture(file);

          // Stop camera
          const stream = video.srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
          }

          onClose();
        }
      },
      "image/jpeg",
      0.8,
    );
  };

  return (
    <div 
      className="fixed inset-0 bg-black z-[60] flex flex-col" 
      data-camera-open="true"
    >
      <div className="flex-1 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="max-w-full max-h-full"
        />
      </div>

      <div className="p-6 flex justify-center gap-8">
        <button
          onClick={startCamera}
          className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm border border-green-400/20 flex items-center justify-center hover:scale-110"
        >
          <span className="text-2xl">🔘</span>
        </button>
        <button
          onClick={takePhoto}
          className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm border border-blue-400/20 flex items-center justify-center hover:scale-110"
        >
          <div className="flex items-center justify-center -mt-2">
            <span className="text-3xl">📸</span>
          </div>
        </button>
        <button
          onClick={onClose}
          className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm border border-red-400/20 flex items-center justify-center hover:scale-110"
        >
          <span className="text-2xl">✕</span>
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
