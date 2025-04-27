// pages/api/runtime-config.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // These environment variables are set in each environment
    const config = {
      apiUrl: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL,
      mqttUrl: process.env.MQTT_URL || process.env.NEXT_PUBLIC_MQTT_URL,
      stripeKey: process.env.STRIPE_KEY || process.env.NEXT_PUBLIC_STRIPE_KEY,
      // Include environment name for debugging
      environment: process.env.NODE_ENV,
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
    res.status(500).json({ error: 'Failed to load configuration' });
  }
}