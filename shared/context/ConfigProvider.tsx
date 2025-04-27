// shared/context/ConfigProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

interface Config {
  apiUrl?: string;
  mqttUrl?: string;
  stripeKey?: string;
  [key: string]: string | undefined;
}

const ConfigContext = createContext<{
  config: Config;
  isLoading: boolean;
}>({
  config: {},
  isLoading: true,
});

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<Config>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch('/api/runtime-config');
        const data = await response.json();
        setConfig(data);
      } catch (error) {
        console.error('Failed to load runtime config:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadConfig();
  }, []);

  return (
    <ConfigContext.Provider value={{ config, isLoading }}>
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);