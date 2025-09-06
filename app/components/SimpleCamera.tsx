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
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      alert('Camera access denied or not available');
      onClose();
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
        onCapture(file);
        
        // Stop camera
        const stream = video.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        
        onClose();
      }
    }, 'image/jpeg', 0.8);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="max-w-full max-h-full"
        />
      </div>
      
      <div className="p-4 flex gap-4">
        <button 
          onClick={startCamera}
          className="flex-1 bg-blue-500 text-white py-3 rounded"
        >
          Start Camera
        </button>
        <button 
          onClick={takePhoto}
          className="flex-1 bg-green-500 text-white py-3 rounded"
        >
          Take Photo
        </button>
        <button 
          onClick={onClose}
          className="flex-1 bg-red-500 text-white py-3 rounded"
        >
          Close
        </button>
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
