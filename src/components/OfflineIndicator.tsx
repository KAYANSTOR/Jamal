import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '../lib/utils';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [showOnline, setShowOnline] = useState(false);

  useEffect(() => {
    if (isOnline) {
      setShowOnline(true);
      const timer = setTimeout(() => setShowOnline(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (isOnline && !showOnline) return null;

  return (
    <div className={cn(
      "fixed top-0 left-0 w-full z-[100] flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-bold text-white shadow-md transition-all duration-300",
      isOnline ? "bg-emerald-600" : "bg-rose-600"
    )}>
      {isOnline ? (
        <>
          <Wifi size={14} />
          <span>التطبيق متصل بالإنترنت ويعمل في وضع Online</span>
        </>
      ) : (
        <>
          <WifiOff size={14} />
          <span>وضع Offline: لا يوجد اتصال بالإنترنت. التطبيق يعتمد على الذاكرة المحلية حالياً.</span>
        </>
      )}
    </div>
  );
};
