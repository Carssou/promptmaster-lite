import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

interface SkeletonGroupProps {
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width = '100%',
  height = '1rem',
  animation = 'pulse'
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md'
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  };

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      role="status"
      aria-label="Loading..."
    />
  );
}

export function SkeletonGroup({ children, loading = false, className = '' }: SkeletonGroupProps) {
  if (loading) {
    return <div className={className}>{children}</div>;
  }
  
  return null;
}

// Predefined skeleton components for common use cases
export function TextSkeleton({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          height="1rem"
          width={index === lines - 1 ? '75%' : '100%'}
        />
      ))}
    </div>
  );
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 border border-gray-200 rounded-lg ${className}`}>
      <div className="flex items-center space-x-3 mb-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1">
          <Skeleton variant="text" height="1rem" width="60%" />
          <Skeleton variant="text" height="0.75rem" width="40%" />
        </div>
      </div>
      <TextSkeleton lines={3} />
    </div>
  );
}

export function VersionItemSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`p-3 border-b border-gray-100 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Skeleton variant="circular" width={14} height={14} />
          <Skeleton variant="text" width="4rem" height="1rem" />
          <Skeleton variant="text" width="3rem" height="1rem" />
        </div>
        <Skeleton variant="circular" width={14} height={14} />
      </div>
      <div className="flex items-center space-x-2 mb-2">
        <Skeleton variant="circular" width={12} height={12} />
        <Skeleton variant="text" width="6rem" height="0.75rem" />
      </div>
      <Skeleton variant="text" width="90%" height="0.75rem" />
    </div>
  );
}

export function EditorSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden ${className}`}>
      <div className="bg-gray-50 border-b border-gray-200 p-2">
        <div className="flex items-center space-x-2">
          <Skeleton variant="circular" width={12} height={12} />
          <Skeleton variant="circular" width={12} height={12} />
          <Skeleton variant="circular" width={12} height={12} />
        </div>
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="flex items-center space-x-2">
            <Skeleton variant="text" width="2rem" height="1rem" />
            <Skeleton variant="text" width={`${Math.random() * 60 + 40}%`} height="1rem" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DiffSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden ${className}`}>
      <div className="bg-gray-50 border-b border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width="12rem" height="1.25rem" />
          <Skeleton variant="text" width="4rem" height="1rem" />
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex">
            <div className="w-1/2 p-2 border-r border-gray-200">
              <Skeleton variant="text" width="90%" height="1rem" />
            </div>
            <div className="w-1/2 p-2">
              <Skeleton variant="text" width="85%" height="1rem" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}