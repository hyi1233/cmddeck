import { useState, useEffect } from 'react';
import { loadSettings, saveSettings } from '../utils/store';

export function useTheme() {
  const [settings, setSettings] = useState(() => loadSettings());

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveSettings(settings);
  }, [settings]);

  const toggleTheme = () => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  const updateSettings = (updates) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  return { settings, toggleTheme, updateSettings };
}
