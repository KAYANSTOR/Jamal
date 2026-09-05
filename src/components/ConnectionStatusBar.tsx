import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { useOnlineStatus } from './OfflineIndicator';

export const ConnectionStatusBar: React.FC = () => {
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
      "w-full flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white transition-all duration-300 z-50",
      isOnline ? "bg-emerald-600" : "bg-rose-600"
    )}>
      {isOnline ? (
        <>
          <Wifi size={16} />
          <span>متصل بالإنترنت — يتم الآن مزامنة التطبيق سحابياً</span>
        </>
      ) : (
        <>
          <WifiOff size={16} />
          <span>وضع Offline: لا يوجد اتصال. التطبيق يعتمد على الذاكرة المحلية (Offline-First).</span>
        </>
      )}
    </div>
  );
};
