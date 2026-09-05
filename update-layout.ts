import fs from 'fs';
let content = fs.readFileSync('src/components/layout/AppLayout.tsx', 'utf8');

if (!content.includes('ArrowLeftRight')) {
  // Add import
  content = content.replace(
    "import { Menu, Search, Bell, Settings, LogOut, ChevronDown, Package, Users, ShoppingCart, LayoutDashboard, Database, Tags, RefreshCcw, BoxSelect, History, Undo2 } from 'lucide-react';",
    "import { Menu, Search, Bell, Settings, LogOut, ChevronDown, Package, Users, ShoppingCart, LayoutDashboard, Database, Tags, RefreshCcw, BoxSelect, History, Undo2, ArrowLeftRight } from 'lucide-react';"
  );
}

if (!content.includes('/transfers')) {
  content = content.replace(
    "{ name: 'المرتجعات', path: '/returns', icon: Undo2 },",
    "{ name: 'المرتجعات', path: '/returns', icon: Undo2 },\n  { name: 'التحويلات', path: '/transfers', icon: ArrowLeftRight },"
  );
  
  fs.writeFileSync('src/components/layout/AppLayout.tsx', content);
}
