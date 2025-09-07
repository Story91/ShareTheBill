"use client";

import { useState, useRef } from "react";
import { OCRResult } from "@/lib/types";

interface AdvancedOCRProps {
  onOCRComplete: (result: OCRResult) => void;
  onClose: () => void;
}

export function AdvancedOCR({ onOCRComplete, onClose }: AdvancedOCRProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handleCameraCapture = () => {
    // This would integrate with the SimpleCamera component
    // For now, trigger file input
    fileInputRef.current?.click();
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setProcessingStep("Preparing image...");

    try {
      // Step 1: Preprocess image for better OCR
      const preprocessedFile = await preprocessImage(file);
      setProcessingStep("Optimizing for digit recognition...");

      // Step 2: Send to advanced OCR endpoint
      const formData = new FormData();
      formData.append("image", preprocessedFile);

      setProcessingStep("Analyzing image with AI...");

      const response = await fetch("/api/ocr-advanced", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OCR failed: ${response.statusText}`);
      }

      const result: OCRResult = await response.json();
      setProcessingStep("OCR complete!");

      setTimeout(() => {
        onOCRComplete(result);
        setIsProcessing(false);
      }, 500);

    } catch (error) {
      console.error("OCR processing error:", error);
      setProcessingStep("OCR processing failed");
      
      setTimeout(() => {
        setIsProcessing(false);
        alert("OCR processing failed. Please try again or enter amounts manually.");
      }, 1000);
    }
  };

  const preprocessImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;

      img.onload = () => {
        // Set canvas size
        const maxSize = 1200; // Limit size for processing speed
        let { width, height } = img;
        
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Apply image enhancements for better OCR
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Increase contrast and brightness for better text recognition
        for (let i = 0; i < data.length; i += 4) {
          // Convert to grayscale first
          const grayscale = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          
          // Apply high contrast
          const contrast = 1.5;
          const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));
          const enhancedValue = Math.min(255, Math.max(0, factor * (grayscale - 128) + 128));
          
          // Apply threshold for better digit recognition
          const threshold = enhancedValue > 128 ? 255 : 0;
          
          data[i] = threshold;     // Red
          data[i + 1] = threshold; // Green
          data[i + 2] = threshold; // Blue
          // Alpha stays the same
        }

        ctx.putImageData(imageData, 0, 0);

        // Convert back to file
        canvas.toBlob((blob) => {
          if (blob) {
            const processedFile = new File([blob], file.name, { type: 'image/jpeg' });
            
            // Create preview
            const reader = new FileReader();
            reader.onload = () => setPreviewImage(reader.result as string);
            reader.readAsDataURL(processedFile);
            
            resolve(processedFile);
          } else {
            resolve(file); // Fallback to original
          }
        }, 'image/jpeg', 0.9);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Advanced OCR Scanner</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isProcessing}
          >
            ✕
          </button>
        </div>

        {!isProcessing ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Scan a receipt or bill to automatically detect amounts
              </p>
              
              <div className="space-y-2">
                <button
                  onClick={handleCameraCapture}
                  className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  📷 Take Photo
                </button>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors"
                >
                  📁 Choose File
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="text-xs text-gray-500 text-center">
              <p>✓ Google Vision AI</p>
              <p>✓ Optimized digit recognition</p>
              <p>✓ Multiple fallback methods</p>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            
            <div>
              <p className="font-medium text-gray-800">{processingStep}</p>
              <p className="text-sm text-gray-600">This may take a few seconds...</p>
            </div>

            {previewImage && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Processed image:</p>
                <img 
                  src={previewImage} 
                  alt="Processed" 
                  className="max-w-full h-32 object-contain mx-auto border rounded"
                />
              </div>
            )}
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
