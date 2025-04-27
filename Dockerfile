FROM node:18-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json ./
# Create an empty yarn.lock if it doesn't exist
RUN touch yarn.lock
RUN yarn cache clean
COPY yarn.lock ./
RUN yarn install
USER node

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time arguments for compile-time configuration
ARG NEXT_PUBLIC_VERCEL_ENV
ARG NEXT_PUBLIC_SUPPORT_EMAIL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MQTT_URL
ARG NEXT_PUBLIC_SHORT_SHA
ARG NEXT_PUBLIC_STRIPE_KEY

ENV NEXT_TELEMETRY_DISABLED=1

RUN yarn build

# Production image
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy necessary files for running Next.js without standalone mode
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# Runtime environment variables
# These will be set when running the container
# Prioritize non-NEXT_PUBLIC_ variables, fall back to NEXT_PUBLIC_ variables
ENV API_URL=${API_URL}
ENV MQTT_URL=${MQTT_URL}
ENV STRIPE_KEY=${STRIPE_KEY}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_MQTT_URL=${NEXT_PUBLIC_MQTT_URL}
ENV NEXT_PUBLIC_STRIPE_KEY=${NEXT_PUBLIC_STRIPE_KEY}

USER node

EXPOSE 3000

# Use next start instead of server.js
CMD ["yarn", "start"]