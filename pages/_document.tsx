// _document.tsx
import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document';

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    
    // Get runtime config from environment variables
    const runtimeConfig = {
      apiUrl: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL,
      mqttUrl: process.env.MQTT_URL || process.env.NEXT_PUBLIC_MQTT_URL,
      stripeKey: process.env.STRIPE_KEY || process.env.NEXT_PUBLIC_STRIPE_KEY,
      environment: process.env.NODE_ENV,
    };
    
    return { 
      ...initialProps,
      runtimeConfig,
    };
  }

  render() {
    const { runtimeConfig } = this.props as any;
    
    return (
      <Html>
        <Head />
        <body>
          {/* Inject runtime config into the window object */}
          {runtimeConfig && (
            <script
              dangerouslySetInnerHTML={{
                __html: `window.__RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig)};`,
              }}
            />
          )}
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
