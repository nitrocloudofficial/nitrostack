import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({ className = 'h-6 w-full' }) => {
  return (
    <div className={`bg-slate-800/60 animate-pulse rounded-xl ${className}`} />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
      <div className="flex justify-between items-center">
        <SkeletonLoader className="h-4 w-32" />
        <SkeletonLoader className="h-8 w-8 rounded-xl" />
      </div>
      <SkeletonLoader className="h-8 w-48" />
      <SkeletonLoader className="h-3 w-24" />
    </div>
  );
};
