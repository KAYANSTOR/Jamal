import fs from 'fs';

let content = fs.readFileSync('src/components/layout/AppLayout.tsx', 'utf8');

const newNav = `  const navigation = [
    { name: 'الرئيسية', icon: Activity, href: '/' },
    { name: 'المخازن', icon: Database, href: '/warehouses' },
    { name: 'الأصناف', icon: Package, href: '/products' },
    { name: 'التقارير', icon: BarChart3, href: '/reports' },
    { name: 'الإعدادات', icon: Settings, href: '/settings' },
  ];`;

// We use regex to replace the old navigation array
content = content.replace(/const navigation = \[[^\]]*\];/, newNav);

fs.writeFileSync('src/components/layout/AppLayout.tsx', content);
