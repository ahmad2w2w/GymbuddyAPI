import { useState, useRef, useEffect, ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;
  className?: string;
  disabled?: boolean;
}

export default function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  className,
  disabled = false
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || window.scrollY > 0) return;
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || !startY || window.scrollY > 0) return;
    
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY);
    
    if (distance > 10) {
      setIsPulling(true);
      setPullDistance(Math.min(distance, threshold * 1.5));
      
      // Prevent default scrolling when pulling
      e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (disabled || !isPulling) return;
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh error:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setIsPulling(false);
    setPullDistance(0);
    setStartY(0);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [startY, isPulling, pullDistance, threshold, disabled, isRefreshing]);

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance >= threshold;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 z-10",
          "bg-gradient-to-b from-blue-50 to-transparent",
          isPulling || isRefreshing ? "opacity-100" : "opacity-0"
        )}
        style={{
          height: Math.max(pullDistance * 0.8, isRefreshing ? 60 : 0),
          transform: `translateY(${isPulling ? 0 : isRefreshing ? 0 : -60}px)`
        }}
      >
        <div className="flex flex-col items-center gap-2 py-4">
          <div
            className={cn(
              "transition-all duration-200",
              shouldTrigger ? "text-green-600" : "text-blue-600"
            )}
          >
            <RefreshCw
              className={cn(
                "w-6 h-6 transition-transform duration-200",
                isRefreshing && "animate-spin",
                !isRefreshing && `rotate-${Math.floor(pullProgress * 360)}`
              )}
              style={{
                transform: !isRefreshing ? `rotate(${pullProgress * 360}deg)` : undefined
              }}
            />
          </div>
          <span
            className={cn(
              "text-sm font-medium transition-colors duration-200",
              shouldTrigger ? "text-green-600" : "text-blue-600"
            )}
          >
            {isRefreshing
              ? "Vernieuwen..."
              : shouldTrigger
              ? "Loslaten om te vernieuwen"
              : "Trek naar beneden"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          "transition-transform duration-200",
          (isPulling || isRefreshing) && "transform"
        )}
        style={{
          transform: isPulling ? `translateY(${pullDistance * 0.5}px)` : 
                     isRefreshing ? `translateY(30px)` : 'translateY(0)'
        }}
      >
        {children}
      </div>
    </div>
  );
}