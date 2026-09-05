import fs from 'fs';
const path = '/app/applet/src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacement = `
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Warehouses } from './pages/Warehouses';
import { Products } from './pages/Products';
import { Purchases } from './pages/Purchases';
import { Suppliers } from './pages/Suppliers';
import { Departments } from './pages/Departments';
import { MaterialIssues } from './pages/MaterialIssues';
import { MaterialReturns } from './pages/MaterialReturns';
import { StockTransfers } from './pages/StockTransfers';
import { Reports } from './pages/Reports';
import { OpeningBalances } from './pages/OpeningBalances';
import { PhysicalInventory } from './pages/PhysicalInventory';
import { Settings } from './pages/Settings';
import { syncEngine } from './lib/db';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const token = await currentUser.getIdToken();
        localStorage.setItem('auth_token', token);
        setUser(currentUser);
        // Once logged in, trigger initial pull
        syncEngine.initialPull().then(() => syncEngine.triggerSync());
      } else {
        localStorage.removeItem('auth_token');
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">جاري التحميل...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/warehouses" element={<Warehouses />} />
        <Route path="/products" element={<Products />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/departments" element={<Departments />} />
        <Route path="/issues" element={<MaterialIssues />} />
        <Route path="/returns" element={<MaterialReturns />} />  
        <Route path="/transfers" element={<StockTransfers />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/opening-balances" element={<OpeningBalances />} />
        <Route path="/inventory-count" element={<PhysicalInventory />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
`;

fs.writeFileSync(path, replacement);
