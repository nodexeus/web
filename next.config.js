/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Development optimizations
  ...(process.env.NODE_ENV === 'development' && {
    // Faster builds in development
    swcMinify: false,
    // Reduce memory usage
    experimental: {
      workerThreads: false,
      cpus: 1,
    },
  }),
  // Enforce consistent URL handling
  trailingSlash: false,
  // Make server-side environment variables available to the API routes
  serverRuntimeConfig: {
    // Will only be available on the server side
    apiUrl: process.env.API_URL,
    mqttUrl: process.env.MQTT_URL,
    stripeKey: process.env.STRIPE_KEY,
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
    // Prioritize non-NEXT_PUBLIC_ variables, fall back to NEXT_PUBLIC_ variables
    apiUrl: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL,
    mqttUrl: process.env.MQTT_URL || process.env.NEXT_PUBLIC_MQTT_URL,
    stripeKey: process.env.STRIPE_KEY || process.env.NEXT_PUBLIC_STRIPE_KEY,
    environment: process.env.NODE_ENV,
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      // issuer section restricts svg as component only to
      // svgs imported from js / ts files.
      //
      // This allows configuring other behavior for
      // svgs imported from other file types (such as .css)
      issuer: { and: [/\.(js|ts|md)x?$/] },
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            svgoConfig: {
              plugins: [{ name: 'preset-default', removeViewBox: false }],
            },
          },
        },
      ],
    });
    return config;
  },
};

module.exports = nextConfig;
