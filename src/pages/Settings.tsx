import React, { useState, useEffect } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Settings2, Bell, RefreshCw, HardDrive, ShieldCheck, CheckCircle2, Cloud, Building, CreditCard } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { getSettings, saveSettings, AppSettings } from '../lib/settings';
import { syncEngine } from '../lib/db';

type SettingsTab = 'GENERAL' | 'ALERTS' | 'DATA';

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('GENERAL');
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [success, setSuccess] = useState(false);

  // Sync Stats
  const outboxCount = useLiveQuery(() => db.outbox.count()) || 0;
  const pendingSync = outboxCount > 0;

  useEffect(() => {
    const handleSettingsUpdate = () => setSettings(getSettings());
    window.addEventListener('settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('settings_updated', handleSettingsUpdate);
  }, []);

  const handleSave = () => {
    saveSettings(settings);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const [isSyncing, setIsSyncing] = useState(false);
  
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
  };

  return (
    <AppLayout 
      pageTitle="الإعدادات"
      headerSubtitle="إدارة تفضيلات النظام، بيانات الشركة، التنبيهات، والربط السحابي"
    >
      {success && (
        <div className="mb-6 bg-[var(--color-success)]/10 border border-[var(--color-success)] text-[var(--color-success-dark)] p-4 rounded-[var(--radius-lg)] flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={24} />
          <div>
            <h3 className="font-bold">تم حفظ الإعدادات بنجاح!</h3>
            <p className="text-sm opacity-90">تم تحديث تفضيلات النظام في وحدة التخزين المحلية.</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-4">
        {/* Settings Sidebar */}
        <div className="xl:col-span-1 flex flex-row xl:flex-col gap-2 overflow-x-auto pb-2 xl:pb-0">
          <Button 
            variant={activeTab === 'GENERAL' ? 'default' : 'ghost'} 
            className="justify-start xl:w-full"
            onClick={() => setActiveTab('GENERAL')}
          >
            <Settings2 size={18} className="me-2" />
            إعدادات عامة
          </Button>
          <Button 
            variant={activeTab === 'ALERTS' ? 'default' : 'ghost'} 
            className="justify-start xl:w-full"
            onClick={() => setActiveTab('ALERTS')}
          >
            <Bell size={18} className="me-2" />
            التنبيهات والإشعارات
          </Button>
          <Button 
            variant={activeTab === 'DATA' ? 'default' : 'ghost'} 
            className="justify-start xl:w-full"
            onClick={() => setActiveTab('DATA')}
          >
            <HardDrive size={18} className="me-2" />
            البيانات والمزامنة السحابية
          </Button>
        </div>

        {/* Settings Content */}
        <div className="xl:col-span-3">
          
          {activeTab === 'GENERAL' && (
            <Card className="shadow-[var(--shadow-soft)] border-0 ring-1 ring-[var(--color-border)]">
              <CardHeader className="border-b border-[var(--color-border)] pb-4 bg-[var(--color-muted)]/30">
                <CardTitle className="text-lg">إعدادات النظام العامة</CardTitle>
                <CardDescription>إدارة بيانات الشركة، العملة، والإعدادات الإقليمية</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                
                {/* Company Info */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Building size={18} className="text-[var(--color-primary)]" />
                    بيانات الشركة والترويسة
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[var(--color-muted-foreground)]">اسم الشركة / المؤسسة</label>
                      <Input 
                        value={settings.companyName} 
                        onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                        placeholder="أدخل اسم المؤسسة الرسمي"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[var(--color-muted-foreground)]">الرقم الضريبي</label>
                      <Input 
                        value={settings.taxId} 
                        onChange={(e) => setSettings({...settings, taxId: e.target.value})}
                        placeholder="أدخل الرقم الضريبي (15 خانة)"
                        dir="ltr"
                        className="text-right"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-[var(--color-muted-foreground)]">هذه البيانات ستظهر على التقارير الرسمية والفواتير المستخرجة كملفات PDF.</p>
                </div>

                {/* Localization */}
                <div className="space-y-4 pt-4 border-t border-[var(--color-border)]">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <CreditCard size={18} className="text-[var(--color-primary)]" />
                    العملة والخيارات الإقليمية
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[var(--color-muted-foreground)]">العملة الأساسية للنظام</label>
                      <Select 
                        value={settings.currency} 
                        onChange={(e) => setSettings({...settings, currency: e.target.value})}
                      >
                        <option value="SAR">ريال سعودي (SAR)</option>
                        <option value="USD">دولار أمريكي (USD)</option>
                        <option value="EUR">يورو (EUR)</option>
                        <option value="AED">درهم إماراتي (AED)</option>
                        <option value="KWD">دينار كويتي (KWD)</option>
                        <option value="BHD">دينار بحريني (BHD)</option>
                        <option value="QAR">ريال قطري (QAR)</option>
                        <option value="OMR">ريال عماني (OMR)</option>
                        <option value="JOD">دينار أردني (JOD)</option>
                        <option value="EGP">جنيه مصري (EGP)</option>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
                  <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg flex-1 me-4">
                    <p className="text-xs text-[var(--color-muted-foreground)] mb-1">إصدار النظام</p>
                    <p className="font-medium flex items-center gap-2">
                      <ShieldCheck size={16} className="text-[var(--color-success)]" />
                      1.0.0 (Offline-First Build)
                    </p>
                  </div>
                  <Button onClick={handleSave} className="min-w-[120px]">حفظ التغييرات</Button>
                </div>

              </CardContent>
            </Card>
          )}

          {activeTab === 'ALERTS' && (
            <Card className="shadow-[var(--shadow-soft)] border-0 ring-1 ring-[var(--color-border)]">
              <CardHeader className="border-b border-[var(--color-border)] pb-4 bg-[var(--color-muted)]/30">
                <CardTitle className="text-lg">تنبيهات المخزون الذكية</CardTitle>
                <CardDescription>إدارة إشعارات نقص المخزون وحساب مستويات الطلب (Reorder Levels)</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-6">
                  <div>
                    <h4 className="font-medium text-[var(--color-foreground)] text-base">تفعيل تنبيهات نقص المخزون</h4>
                    <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                      سيقوم النظام بحساب الأرصدة الحالية لجميع المخازن وإرسال إشعار في لوحة القيادة إذا وصل رصيد الصنف إلى حد الطلب.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.enableLowStockAlerts}
                      onChange={(e) => setSettings({...settings, enableLowStockAlerts: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-[var(--color-muted)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                  </label>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-[var(--color-foreground)] text-base">معامل حد الطلب (Threshold Multiplier)</h4>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    يستخدم هذا المعامل لضرب الحد الأدنى المسجل لكل صنف. إذا كان 1.0 (طبيعي)، سيتم التنبيه عند الوصول للحد المكتوب. إذا كان أعلى (مثلاً 1.2)، سيتم التنبيه مبكراً بنسبة 20%، وهذا مفيد في المواسم.
                  </p>
                  <Select 
                    value={settings.lowStockThresholdMultiplier.toString()} 
                    onChange={(e) => setSettings({...settings, lowStockThresholdMultiplier: parseFloat(e.target.value)})}
                    disabled={!settings.enableLowStockAlerts}
                  >
                    <option value="1">قياسي (1.0x)</option>
                    <option value="1.1">تنبيه مبكر طفيف (1.1x)</option>
                    <option value="1.2">تنبيه مبكر (1.2x)</option>
                    <option value="1.5">مواسم الذروة (1.5x)</option>
                  </Select>
                </div>

                <div className="flex items-center justify-end pt-4 border-t border-[var(--color-border)]">
                  <Button onClick={handleSave} className="min-w-[120px]">حفظ التغييرات</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'DATA' && (
            <Card className="shadow-[var(--shadow-soft)] border-0 ring-1 ring-[var(--color-border)]">
              <CardHeader className="border-b border-[var(--color-border)] pb-4 bg-[var(--color-muted)]/30">
                <CardTitle className="text-lg">البيانات والربط السحابي (Cloud Sync)</CardTitle>
                <CardDescription>إدارة مزامنة البيانات بين الجهاز المحلي (IndexedDB) وقاعدة البيانات السحابية المركزية</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-6">
                  <div>
                    <h4 className="font-medium text-[var(--color-foreground)] text-base flex items-center gap-2">
                      <Cloud size={18} className={settings.enableCloudSync ? "text-[var(--color-primary)]" : "text-gray-400"} />
                      تفعيل الربط السحابي (Cloud Sync)
                    </h4>
                    <p className="text-sm text-[var(--color-muted-foreground)] mt-1 max-w-xl">
                      عند التفعيل، سيقوم النظام تلقائياً برفع العمليات المحلية إلى السيرفر في الخلفية، وسيقوم بجلب التحديثات من الأجهزة الأخرى. يدعم النظام العمل دون اتصال (Offline-First) بشكل كامل، وستتوقف المزامنة مؤقتاً عند فقدان الاتصال.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.enableCloudSync}
                      onChange={(e) => setSettings({...settings, enableCloudSync: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-[var(--color-muted)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                  </label>
                </div>

                <div className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4 ${!settings.enableCloudSync ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${pendingSync ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]' : 'bg-[var(--color-success)]/10 text-[var(--color-success)]'}`}>
                      <RefreshCw size={24} className={pendingSync || isSyncing ? 'animate-spin-slow' : ''} />
                    </div>
                    <div>
                      <h4 className="font-medium text-[var(--color-foreground)] text-base">
                        {pendingSync ? 'توجد عمليات معلقة تحتاج للمزامنة' : 'جميع البيانات متزامنة مع السحابة'}
                      </h4>
                      <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                        العمليات في قائمة الانتظار (Outbox): <span className="font-mono font-bold">{outboxCount}</span>
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={forceSync} disabled={(!pendingSync && !isSyncing) || isSyncing}>
                    {isSyncing ? "جاري المزامنة..." : "مزامنة الآن"}
                  </Button>
                </div>

                <div className="flex items-center justify-end pt-4 border-t border-[var(--color-border)]">
                  <Button onClick={handleSave} className="min-w-[120px]">حفظ التغييرات</Button>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
