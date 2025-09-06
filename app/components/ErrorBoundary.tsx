"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button, Icon } from "./DemoComponents";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // In production, you might want to log this to an error reporting service
    // logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[var(--app-card-bg)] rounded-lg p-6 text-center">
            <Icon name="star" size="lg" className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[var(--app-foreground)] mb-2">
              Something went wrong
            </h2>
            <p className="text-[var(--app-foreground-muted)] mb-4">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mb-4 p-3 bg-red-50 rounded text-sm">
                <summary className="cursor-pointer font-medium text-red-700">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-red-600">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="space-y-2">
              <Button
                variant="primary"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Refresh Page
              </Button>
              <Button
                variant="outline"
                onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook-based error boundary for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    
    // In a real app, you might want to:
    // 1. Log to an error reporting service
    // 2. Show a toast notification
    // 3. Set error state in a global store
    
    // For now, we'll just log and optionally show an alert
    if (process.env.NODE_ENV === 'development') {
      alert(`Error: ${error.message}`);
    }
  };
}

// Error display component for API errors
interface ApiErrorProps {
  error: string | Error;
  onRetry?: () => void;
  className?: string;
}

export function ApiError({ error, onRetry, className = "" }: ApiErrorProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <Icon name="star" className="text-red-500 mt-0.5" size="sm" />
        <div className="flex-1">
          <h4 className="text-red-800 font-medium">Error</h4>
          <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Loading state component
interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = "Loading...", className = "" }: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--app-accent)] mx-auto mb-4"></div>
        <p className="text-[var(--app-foreground-muted)]">{message}</p>
      </div>
    </div>
  );
}

// Empty state component
interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ 
  title, 
  description, 
  action, 
  icon,
  className = "" 
}: EmptyStateProps) {
  return (
    <div className={`text-center p-8 ${className}`}>
      <div className="mb-4">
        {icon || <Icon name="star" size="lg" className="text-[var(--app-foreground-muted)] mx-auto" />}
      </div>
      <h3 className="text-lg font-medium text-[var(--app-foreground)] mb-2">
        {title}
      </h3>
      <p className="text-[var(--app-foreground-muted)] mb-4">
        {description}
      </p>
      {action && (
        <Button
          variant="primary"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}


