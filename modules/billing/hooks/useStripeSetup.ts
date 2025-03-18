import { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { env } from '@shared/constants/env';

export const useStripeSetup = () => {
  const [stripe, setStripe] = useState<Stripe | null>(null);

  useEffect(() => {
    if (!env.stripeKey) return;

    const initializeStripe = async () => {
      const stripeInstance = await loadStripe(env.stripeKey);
      setStripe(stripeInstance);
    };

    initializeStripe();
  }, []);

  return { stripe };
};
