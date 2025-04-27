import { useContext } from 'react';
import { ConfigContext } from '@shared/context/ConfigProvider';

export const useEnv = () => {
  const { config } = useContext(ConfigContext);
  return {
    apiUrl: config.apiUrl,
    mqttUrl: config.mqttUrl,
    stripeKey: config.stripeKey,
  };
};

// For backward compatibility, export a default object
// that will be populated when the config is loaded
export const env = {
  apiUrl: undefined as string | undefined,
  mqttUrl: undefined as string | undefined,
  stripeKey: undefined as string | undefined,
};
