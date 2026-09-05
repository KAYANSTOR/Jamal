import React, { useState } from 'react';
import { usePWAInstall } from '../lib/usePWAInstall';
import { Download } from 'lucide-react';
import { Button } from './ui/button';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <Button
        onClick={install}
        variant="outline"
        size="sm"
        className="flex items-center gap-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition"
      >
        <Download size={16} />
        <span className="hidden sm:inline">تثبيت التطبيق</span>
      </Button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <Button
          onClick={() => setShowIOSGuide(true)}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition"
        >
          <Download size={16} />
          <span className="hidden sm:inline">تثبيت على iOS</span>
        </Button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowIOSGuide(false)}>
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 mb-4 text-right">تثبيت التطبيق على آيفون / آيباد</h3>
              <p className="text-sm text-gray-700 leading-relaxed text-right mb-6">
                1. اضغط على زر <strong>المشاركة (Share)</strong> في شريط أدوات سفاري بالأسفل.<br />
                2. مرر للأسفل واضغط على <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.
              </p>
              <Button onClick={() => setShowIOSGuide(false)} className="w-full">
                حسناً، فهمت
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
