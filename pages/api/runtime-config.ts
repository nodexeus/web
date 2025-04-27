// pages/api/runtime-config.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // These environment variables are set in each environment
  const config = {
    apiUrl: process.env.API_URL,
    mqttUrl: process.env.MQTT_URL,
    stripeKey: process.env.STRIPE_KEY,
  };
  
  // Prevent caching so we always get fresh values
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).json(config);
}