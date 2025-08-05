# Technology Stack

## Framework & Runtime
- **Next.js 13.1.2** - React framework with SSR/SSG capabilities
- **React 18.2.0** - UI library with concurrent features
- **TypeScript 5.8.2** - Type-safe JavaScript with strict configuration
- **Node.js v16.16.0** - Runtime environment (see .nvmrc)

## State Management & Data Fetching
- **Recoil** - State management for complex application state
- **SWR** - Data fetching with caching, revalidation, and error handling
- **React Hook Form** - Form state management with validation

## Styling & UI
- **Emotion** - CSS-in-JS styling with theme support
- **Custom Design System** - Comprehensive component library in `shared/components`
- **CSS Custom Properties** - Theme variables and design tokens
- **Responsive Design** - Mobile-first approach with breakpoint system

## Backend Integration
- **gRPC-Web** - API communication using Protocol Buffers
- **nice-grpc-web** - Type-safe gRPC client library
- **Generated Types** - Auto-generated TypeScript types from protobuf definitions
- **MQTT** - Real-time messaging and notifications

## Third-Party Services
- **Stripe** - Payment processing and subscription management
- **JWT** - Authentication and authorization tokens

## Development Tools
- **Yarn** - Package manager
- **ESLint** - Code linting with Next.js configuration
- **Prettier** - Code formatting
- **Babel** - JavaScript compilation with Emotion preset

## Common Commands

### Development
```bash
# Start development server
yarn dev

# Build for production
yarn build

# Start production server
yarn start

# Run linting
yarn lint

# Export static build
yarn export
```

### Docker
```bash
# Build Docker image
docker build --build-arg NEXT_PUBLIC_VERCEL_ENV=production \
--build-arg NEXT_PUBLIC_API_URL=value -t blockvisor .

# Run container
docker run -p 80:3000 blockvisor
```

### Environment Setup
1. Copy `.env.template` to `.env.local`
2. Configure required environment variables:
   - `NEXT_PUBLIC_API_URL` - Backend API endpoint
   - `NEXT_PUBLIC_MQTT_URL` - MQTT server URL (optional)
   - `NEXT_PUBLIC_STRIPE_KEY` - Stripe public key (optional)

## Build Configuration
- **Webpack customization** for SVG handling with @svgr/webpack
- **Runtime configuration** for environment variable management
- **TypeScript path mapping** for clean imports (@modules/*, @shared/*, etc.)
- **Strict mode disabled** for React to accommodate legacy patterns