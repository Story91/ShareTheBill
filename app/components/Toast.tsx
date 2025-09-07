"use client";

import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300); // Match animation duration
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const getToastStyles = () => {
    const baseStyles = "rounded-xl p-4 shadow-lg backdrop-blur-sm border text-white font-medium flex items-center gap-3";
    
    switch (toast.type) {
      case "success":
        return `${baseStyles} bg-green-500/90 border-green-400/20`;
      case "error":
        return `${baseStyles} bg-red-500/90 border-red-400/20`;
      case "warning":
        return `${baseStyles} bg-amber-500/90 border-amber-400/20`;
      case "info":
        return `${baseStyles} bg-blue-500/90 border-blue-400/20`;
      default:
        return `${baseStyles} bg-gray-500/90 border-gray-400/20`;
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      default:
        return "📝";
    }
  };

  return (
    <div 
      className={`${getToastStyles()} ${isExiting ? 'toast-exit' : 'toast-enter'} cursor-pointer`}
      onClick={() => {
        setIsExiting(true);
        setTimeout(() => onRemove(toast.id), 300);
      }}
    >
      <span className="text-xl">{getIcon()}</span>
      <span className="flex-1">{toast.message}</span>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setIsExiting(true);
          setTimeout(() => onRemove(toast.id), 300);
        }}
        className="text-white/80 hover:text-white text-lg ml-2"
      >
        ×
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }: { toasts: Toast[], onRemove: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = "info", duration?: number) => {
    const id = Date.now().toString();
    const newToast: Toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showSuccess = (message: string, duration?: number) => showToast(message, "success", duration);
  const showError = (message: string, duration?: number) => showToast(message, "error", duration);
  const showWarning = (message: string, duration?: number) => showToast(message, "warning", duration);
  const showInfo = (message: string, duration?: number) => showToast(message, "info", duration);

  return {
    toasts,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeToast,
  };
}
