export interface AppSettings {
  enableLowStockAlerts: boolean;
  lowStockThresholdMultiplier: number;
  companyName: string;
  taxId: string;
  currency: string;
  enableCloudSync: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  enableLowStockAlerts: true,
  lowStockThresholdMultiplier: 1.0,
  companyName: 'مؤسسة الأعمال المتقدمة',
  taxId: '300000000000003',
  currency: 'SAR',
  enableCloudSync: false,
};

export function getSettings(): AppSettings {
  try {
    const stored = localStorage.getItem('app_settings');
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {}
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem('app_settings', JSON.stringify(settings));
  window.dispatchEvent(new Event('settings_updated'));
}
