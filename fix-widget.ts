import fs from 'fs';

let content = fs.readFileSync('src/components/layout/AppLayout.tsx', 'utf8');

const oldCode = `function StockAlertsWidget() {
  const settings = getSettings();
  
  const products = useLiveQuery(() => db.products.toArray()) || [];`;

const newCode = `function StockAlertsWidget() {
  const [settings, setSettings] = React.useState(getSettings());
  
  React.useEffect(() => {
    const handler = () => setSettings(getSettings());
    window.addEventListener('settings_updated', handler);
    return () => window.removeEventListener('settings_updated', handler);
  }, []);
  
  const products = useLiveQuery(() => db.products.toArray()) || [];`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync('src/components/layout/AppLayout.tsx', content);
}
