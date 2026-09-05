import React, { useState } from 'react';
import { auth, googleAuthProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { Building2, Package } from 'lucide-react';
import { Button } from '../components/ui/button';

export function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await signInWithPopup(auth, googleAuthProvider);
      const token = await result.user.getIdToken();
      localStorage.setItem('auth_token', token);
      window.location.reload();
    } catch (err: any) {
      console.error("Login failed", err);
      setError('فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[var(--color-surface)] rounded-2xl shadow-[var(--shadow-elevated)] p-8 border border-[var(--color-border)] text-center">
        <div className="flex justify-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#A67C3A] to-[#C59D5F] text-white shadow-lg">
            <Building2 size={36} strokeWidth={2.5} />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">إدارة المؤسسة</h1>
        <p className="text-[var(--color-muted-foreground)] mb-8">
          نظام مخزون متكامل متعدد المخازن يعمل بخاصية Offline-First
        </p>

        {error && (
          <div className="mb-4 p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-[var(--color-danger)] rounded-lg text-sm">
            {error}
          </div>
        )}

        <Button 
          onClick={handleLogin} 
          disabled={loading}
          className="w-full bg-[#18181B] text-white hover:bg-[#27272A] border border-[#3F3F46] py-6 text-lg rounded-xl flex items-center justify-center gap-3"
        >
          {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول باستخدام Google'}
        </Button>
      </div>
    </div>
  );
}
