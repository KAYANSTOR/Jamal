import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

export const SyncIndicator = () => {
  const pendingCount = useLiveQuery(() => db.outbox.where('status').equals('PENDING').count(), [], 0);
  const syncingCount = useLiveQuery(() => db.outbox.where('status').equals('SYNCING').count(), [], 0);
  const failedCount = useLiveQuery(() => db.outbox.where('status').equals('FAILED').count(), [], 0);
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm font-medium">
        <CloudOff className="h-4 w-4" />
        <span>Offline</span>
        {pendingCount > 0 && <span className="mr-2">({pendingCount} بانتظار المزامنة)</span>}
      </div>
    );
  }

  if (syncingCount > 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-full text-sm font-medium">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>تتم المزامنة...</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-sm font-medium">
        <Cloud className="h-4 w-4" />
        <span>{pendingCount} بانتظار المزامنة</span>
      </div>
    );
  }

  if (failedCount > 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm font-medium">
        <CloudOff className="h-4 w-4" />
        <span>فشل {failedCount}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
      <Cloud className="h-4 w-4" />
      <span>متصل — تمت المزامنة</span>
    </div>
  );
};
