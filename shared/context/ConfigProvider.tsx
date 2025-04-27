// shared/context/ConfigProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

interface Config {
  apiUrl?: string;
  mqttUrl?: string;
  stripeKey?: string;
  mqttUsername?: string;
  mqttPassword?: string;
  [key: string]: string | undefined;
}

// Define the window runtime config type
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      apiUrl?: string;
      mqttUrl?: string;
      stripeKey?: string;
      environment?: string;
    };
  }
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
        // First try to get config from window.__RUNTIME_CONFIG__
        if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__) {
          console.log('Using injected runtime config:', {
            ...window.__RUNTIME_CONFIG__,
            stripeKey: window.__RUNTIME_CONFIG__.stripeKey ? '[REDACTED]' : undefined,
          });
          setConfig(window.__RUNTIME_CONFIG__);
          setIsLoading(false);
          return;
        }

        // Fall back to API if window config is not available
        // Attempt to fetch runtime config
        const response = await fetch('/api/runtime-config');
        
        // Check if the response is ok before parsing JSON
        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Merge with compile-time fallbacks
        const configWithFallbacks = {
          // Fallback to compile-time values
          apiUrl: data.apiUrl || process.env.NEXT_PUBLIC_API_URL,
          mqttUrl: data.mqttUrl || process.env.NEXT_PUBLIC_MQTT_URL,
          stripeKey: data.stripeKey || process.env.NEXT_PUBLIC_STRIPE_KEY,
          // Add any other config values here
        };
        
        console.log('Runtime config loaded:', {
          ...configWithFallbacks,
          stripeKey: configWithFallbacks.stripeKey ? '[REDACTED]' : undefined,
        });
        setConfig(configWithFallbacks);
      } catch (error) {
        console.error('Failed to load runtime config:', error);
        
        // Fall back to compile-time values
        const fallbackConfig = {
          apiUrl: process.env.NEXT_PUBLIC_API_URL,
          mqttUrl: process.env.NEXT_PUBLIC_MQTT_URL,
          stripeKey: process.env.NEXT_PUBLIC_STRIPE_KEY,
          // Add any other config values here
        };
        
        console.log('Using fallback config:', {
          ...fallbackConfig,
          stripeKey: fallbackConfig.stripeKey ? '[REDACTED]' : undefined,
        });
        setConfig(fallbackConfig);
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