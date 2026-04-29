# Nodexeus Web

User-centric dashboard for deploying, managing, and monitoring blockchain nodes and infrastructure. Built on Next.js 14 with the App Router.

## Getting Started

### Prerequisites

- **Node.js:** v20 (see [.nvmrc](.nvmrc))
- **Yarn:** Used for dependency management

### Installation

1. Clone the repository:

    ```bash
    git clone git@github.com:nodexeus/web.git
    cd web
    ```

2. Install dependencies:

    ```bash
    yarn install
    ```

3. Copy the environment template and fill in values:

    ```bash
    cp .env.template .env.local
    ```

### Running the project

- **Development:**

    ```bash
    yarn dev
    ```

- **Production build:**

    ```bash
    yarn build && yarn start
    ```

The project starts on `http://localhost:3000`.

## Environment Variables

Copy [.env.template](.env.template) to `.env.local` and configure:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | gRPC-Web API endpoint |
| `NEXT_PUBLIC_MQTT_URL` | MQTT WebSocket URL for real-time events |
| `NEXT_PUBLIC_STRIPE_KEY` | Stripe publishable key (optional) |
| `NEXT_PUBLIC_VERCEL_ENV` | Deployment environment (`production`, `development`) |
| `NEXT_PUBLIC_SHORT_SHA` | Git commit SHA — injected automatically by CI |

See [Next.js environment variable docs](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables) for details.

## Deployment

### Docker

Build:

```bash
docker build \
  --build-arg NEXT_PUBLIC_VERCEL_ENV=production \
  --build-arg NEXT_PUBLIC_API_URL=<value> \
  --build-arg NEXT_PUBLIC_MQTT_URL=<value> \
  --build-arg NEXT_PUBLIC_SHORT_SHA=$(git rev-parse --short HEAD) \
  -t nodexeus/bv-web:latest .
```

Run:

```bash
docker run -p 3000:3000 nodexeus/bv-web:latest
```

### CI/CD

Pushes to `develop` and `main` trigger [bv-web-build.yml](.github/workflows/bv-web-build.yml), which builds and pushes images to Docker Hub for three environments: **demo**, **development**, and **production**.

## Tech Stack

- [Next.js 14](https://nextjs.org/) — App Router, server components, API routes
- [React 18](https://react.dev/) — UI framework
- [TanStack Query](https://tanstack.com/query) — Server state management
- [Zustand](https://zustand-demo.pmnd.rs/) — Client state management
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) — Styling
- [nice-grpc-web](https://github.com/nicolo-ribaudo/nice-grpc) — gRPC-Web client
- [MQTT.js](https://github.com/mqttjs/MQTT.js) — Real-time messaging
