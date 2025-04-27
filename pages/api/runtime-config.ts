// pages/api/runtime-config.ts
import { NextApiRequest, NextApiResponse } from 'next';
import getConfig from 'next/config';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get runtime config from Next.js
    const { serverRuntimeConfig, publicRuntimeConfig } = getConfig();
    
    // These environment variables are set in each environment
    // Prioritize non-NEXT_PUBLIC_ variables, fall back to NEXT_PUBLIC_ variables
    const config = {
      apiUrl: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || publicRuntimeConfig.apiUrl,
      mqttUrl: process.env.MQTT_URL || process.env.NEXT_PUBLIC_MQTT_URL || publicRuntimeConfig.mqttUrl,
      stripeKey: process.env.STRIPE_KEY || process.env.NEXT_PUBLIC_STRIPE_KEY || publicRuntimeConfig.stripeKey,
      // Include environment name for debugging
      environment: process.env.NODE_ENV || publicRuntimeConfig.environment,
    };
    
    // Log the config being returned (excluding sensitive values)
    console.log('Runtime config endpoint returning:', {
      ...config,
      stripeKey: config.stripeKey ? '[REDACTED]' : undefined,
    });
    
    // Prevent caching so we always get fresh values
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).json(config);
  } catch (error) {
    console.error('Error in runtime-config API:', error);
    res.status(500).json({ 
      error: 'Failed to load configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}