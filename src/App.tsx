import React, { useEffect } from 'react';
import ForensicsApp from './components/ForensicsApp';
import AuthView from './components/views/AuthView';
import { useAppStore } from './store';

export default function App() {
  const { user, theme } = useAppStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (!user) {
    return <AuthView />;
  }

  return <ForensicsApp />;
}
