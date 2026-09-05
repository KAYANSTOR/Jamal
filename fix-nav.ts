import fs from 'fs';

let content = fs.readFileSync('src/components/layout/AppLayout.tsx', 'utf8');

content = content.replace(
  "import { Building2, Package, FileText, Settings, User, Users, Bell, Wifi, WifiOff, RefreshCw, Database, ShoppingCart, Activity, ArrowLeftRight } from 'lucide-react';",
  "import { Building2, Package, FileText, Settings, User, Users, Bell, Wifi, WifiOff, RefreshCw, Database, ShoppingCart, Activity, ArrowLeftRight, BarChart3, ClipboardCheck, Scale } from 'lucide-react';"
);

fs.writeFileSync('src/components/layout/AppLayout.tsx', content);
