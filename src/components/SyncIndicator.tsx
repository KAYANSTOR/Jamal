import { useLiveQuery } from 'dexie-react-hooks';
import { db, syncEngine } from '../lib/db';
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export const SyncIndicator = () => {
  const pendingCount = useLiveQuery(() => db.outbox.where('status').equals('PENDING').count(), [], 0) ?? 0;
  const syncingCount = useLiveQuery(() => db.outbox.where('status').equals('SYNCING').count(), [], 0) ?? 0;
  const failedCount = useLiveQuery(() => db.outbox.where('status').equals('FAILED').count(), [], 0) ?? 0;
  const conflictCount = useLiveQuery(() => db.outbox.where('status').equals('CONFLICT').count(), [], 0) ?? 0;

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lastSync, setLastSync] = useState<string | null>(syncEngine.getLastSyncAt());
  const [manualSyncing, setManualSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handlePulled = () => setLastSync(syncEngine.getLastSyncAt());

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync_pulled', handlePulled);

    // Refresh lastSync display every 30s
    const t = setInterval(() => setLastSync(syncEngine.getLastSyncAt()), 30_000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync_pulled', handlePulled);
      clearInterval(t);
    };
  }, []);

  const handleManualSync = async () => {
    if (manualSyncing || !isOnline) return;
    setManualSyncing(true);
    try {
      await syncEngine.fullSync();
      setLastSync(syncEngine.getLastSyncAt());
    } finally {
      setManualSyncing(false);
    }
  };

  const formatLastSync = (iso: string | null) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
      if (diffMin < 1) return 'الآن';
      if (diffMin < 60) return `قبل ${diffMin} د`;
      return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return null;
    }
  };

  const lastSyncLabel = formatLastSync(lastSync);

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm font-medium">
        <CloudOff className="h-4 w-4" />
        <span>Offline</span>
        {pendingCount > 0 && (
          <span className="opacity-80">({pendingCount} بانتظار المزامنة)</span>
        )}
      </div>
    );
  }

  if (syncingCount > 0 || manualSyncing || syncEngine.isSyncing || syncEngine.isPulling) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-full text-sm font-medium">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>جاري المزامنة...</span>
      </div>
    );
  }

  if (conflictCount > 0) {
    return (
      <button
        type="button"
        onClick={handleManualSync}
        className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm font-medium hover:bg-red-100 transition"
        title="يوجد تعارضات — اضغط لإعادة المحاولة"
      >
        <CloudOff className="h-4 w-4" />
        <span>{conflictCount} تعارض</span>
      </button>
    );
  }

  if (failedCount > 0) {
    return (
      <button
        type="button"
        onClick={handleManualSync}
        className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-sm font-medium hover:bg-orange-100 transition"
        title="اضغط لإعادة المحاولة"
      >
        <CloudOff className="h-4 w-4" />
        <span>فشل {failedCount} — إعادة</span>
      </button>
    );
  }

  if (pendingCount > 0) {
    return (
      <button
        type="button"
        onClick={handleManualSync}
        className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-sm font-medium hover:bg-orange-100 transition"
        title="اضغط للمزامنة الآن"
      >
        <Cloud className="h-4 w-4" />
        <span>{pendingCount} بانتظار المزامنة</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleManualSync}
      className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium hover:bg-green-100 transition"
      title="اضغط للمزامنة الآن"
    >
      <CheckCircle2 className="h-4 w-4" />
      <span>
        متصل
        {lastSyncLabel ? ` — ${lastSyncLabel}` : ' — تمت المزامنة'}
      </span>
    </button>
  );
};
