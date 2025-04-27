// _document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  // Get environment variables at render time on the server
  const runtimeConfig = {
    apiUrl: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL,
    mqttUrl: process.env.MQTT_URL || process.env.NEXT_PUBLIC_MQTT_URL,
    stripeKey: process.env.STRIPE_KEY || process.env.NEXT_PUBLIC_STRIPE_KEY,
    environment: process.env.NODE_ENV,
  };

  return (
    <Html>
      <Head />
      <body>
        {/* Inject runtime config directly into the HTML */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__RUNTIME_CONFIG__ = ${JSON.stringify({
              ...runtimeConfig,
              stripeKey: runtimeConfig.stripeKey ? runtimeConfig.stripeKey : undefined,
            })};`,
          }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
