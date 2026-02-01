'use client';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: string;
}

export function Skeleton({ className = '', width, height, rounded = 'rounded-md' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${rounded} ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-12" />
        </div>
        <Skeleton className="h-8 w-8" rounded="rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 flex-shrink-0" rounded="rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-6 w-20" rounded="rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonTabPanel() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20" rounded="rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" rounded="rounded-lg" />
        <Skeleton className="h-10 w-full" rounded="rounded-lg" />
        <Skeleton className="h-10 w-full" rounded="rounded-lg" />
        <Skeleton className="h-10 w-5/6" rounded="rounded-lg" />
      </div>
    </div>
  );
}
