// shared/context/ConfigProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import getConfig from 'next/config';

interface Config {
  apiUrl?: string;
  mqttUrl?: string;
  stripeKey?: string;
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
      console.log('ConfigProvider: Starting config load process');
      try {
        // Get Next.js runtime config
        const { publicRuntimeConfig } = getConfig() || { publicRuntimeConfig: {} };
        console.log('ConfigProvider: publicRuntimeConfig available:', Object.keys(publicRuntimeConfig).length > 0);
        
        // Check if window config exists but don't exit early
        const hasWindowConfig = typeof window !== 'undefined' && window.__RUNTIME_CONFIG__;
        console.log('ConfigProvider: Window runtime config available:', hasWindowConfig);
        
        // Always try to fetch from API first
        try {
          console.log('ConfigProvider: Attempting to fetch runtime config from API');
          const response = await fetch('/api/runtime-config');
          
          // Check if the response is ok before parsing JSON
          if (!response.ok) {
            console.warn(`ConfigProvider: API returned ${response.status}: ${response.statusText}`);
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          console.log('ConfigProvider: Successfully fetched config from API');
          
          // Merge with compile-time fallbacks
          const configWithFallbacks = {
            // Fallback to compile-time values from publicRuntimeConfig
            apiUrl: data.apiUrl || publicRuntimeConfig.apiUrl,
            mqttUrl: data.mqttUrl || publicRuntimeConfig.mqttUrl,
            stripeKey: data.stripeKey || publicRuntimeConfig.stripeKey,
            // Add any other config values here
          };
          
          console.log('ConfigProvider: Runtime config loaded from API:', {
            ...configWithFallbacks,
            stripeKey: configWithFallbacks.stripeKey ? '[REDACTED]' : undefined,
          });
          setConfig(configWithFallbacks);
          setIsLoading(false);
          return;
        } catch (apiError) {
          console.warn('ConfigProvider: Failed to load runtime config from API:', apiError);
          
          // If API fetch fails, try window config as a fallback
          if (hasWindowConfig) {
            console.log('ConfigProvider: Falling back to window runtime config');
            setConfig(window.__RUNTIME_CONFIG__);
            setIsLoading(false);
            return;
          }
          
          // If window config is not available, throw to fall back to publicRuntimeConfig
          throw apiError;
        }
      } catch (error) {
        console.error('ConfigProvider: All runtime config sources failed:', error);
        
        // Fall back to Next.js runtime config
        const { publicRuntimeConfig } = getConfig() || { publicRuntimeConfig: {} };
        
        const fallbackConfig = {
          apiUrl: publicRuntimeConfig.apiUrl,
          mqttUrl: publicRuntimeConfig.mqttUrl,
          stripeKey: publicRuntimeConfig.stripeKey,
          // Add any other config values here
        };
        
        console.log('ConfigProvider: Using fallback config from next.config.js:', {
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