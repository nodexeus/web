// pages/api/runtime-config.ts
import { NextApiRequest, NextApiResponse } from 'next';
import getConfig from 'next/config';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('runtime-config API: Endpoint called');
  try {
    // Get runtime config from Next.js
    const { serverRuntimeConfig, publicRuntimeConfig } = getConfig() || { 
      serverRuntimeConfig: {}, 
      publicRuntimeConfig: {} 
    };
    
    console.log('runtime-config API: Config obtained from Next.js', {
      hasServerConfig: Object.keys(serverRuntimeConfig || {}).length > 0,
      hasPublicConfig: Object.keys(publicRuntimeConfig || {}).length > 0
    });
    
    // Only return non-sensitive configuration values
    // The Stripe key will be loaded directly by components that need it
    const config = {
      apiUrl: process.env.NEXT_PUBLIC_API_URL || publicRuntimeConfig.apiUrl,
      mqttUrl: process.env.NEXT_PUBLIC_MQTT_URL || publicRuntimeConfig.mqttUrl,
      environment: process.env.NODE_ENV || publicRuntimeConfig.environment,
    };
    
    // Log the config being returned
    console.log('runtime-config API: Returning config with values:', {
      ...config,
      hasApiUrl: !!config.apiUrl,
      hasMqttUrl: !!config.mqttUrl,
      environment: config.environment
    });
    
    // Prevent caching so we always get fresh values
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).json(config);
  } catch (error) {
    console.error('runtime-config API: Error in runtime-config API:', error);
    res.status(500).json({ 
      error: 'Failed to load configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}