import fs from 'fs';

let content = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

if (!content.includes('import { syncEngine }')) {
  content = content.replace(
    "import { getSettings, saveSettings, AppSettings } from '../lib/settings';",
    "import { getSettings, saveSettings, AppSettings } from '../lib/settings';\nimport { syncEngine } from '../lib/db';"
  );
}

const oldForceSync = `  const forceSync = () => {
    alert('جاري محاولة المزامنة القسرية مع الخادم...');
    // In a real implementation, you would trigger the background sync worker here
  };`;

const newForceSync = `  const [isSyncing, setIsSyncing] = useState(false);
  const forceSync = async () => {
    setIsSyncing(true);
    try {
      await syncEngine.triggerSync(true);
      alert('اكتملت محاولة المزامنة مع الخادم');
    } catch (e) {
      alert('حدث خطأ أثناء المزامنة');
    } finally {
      setIsSyncing(false);
    }
  };`;

if (content.includes(oldForceSync)) {
  content = content.replace(oldForceSync, newForceSync);
  content = content.replace(
    '<RefreshCw size={24} className={pendingSync ? \'animate-spin-slow\' : \'\'} />',
    '<RefreshCw size={24} className={pendingSync || isSyncing ? \'animate-spin-slow\' : \'\'} />'
  );
  content = content.replace(
    '<Button variant="outline" onClick={forceSync} disabled={!pendingSync}>',
    '<Button variant="outline" onClick={forceSync} disabled={(!pendingSync && !isSyncing) || isSyncing}>\n                    {isSyncing ? "جاري المزامنة..." : "مزامنة الآن"}'
  );
  content = content.replace(
    'مزامنة الآن\n                  </Button>',
    '</Button>'
  );
  fs.writeFileSync('src/pages/Settings.tsx', content);
}
