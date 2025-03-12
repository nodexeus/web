# Blockvisor App Web

User-centric, intuitive dashboard designed for the seamless operation, management, and monitoring of Web3 nodes. It empowers users to deploy, control, and optimize decentralized network infrastructure effortlessly.

## Getting Started

### Prerequisites

-   **Node.js:** v16.16.0 (see [.nvmrc](.nvmrc))
-   **Yarn:** Used for dependency management.

### Installation 📦

1. Clone the repository:

    ```bash
    git clone git@github.com:blockjoy/blockvisor-app-web.git
    cd blockvisor-app-web
    ```

2. Install the dependencies
    ```bash
    yarn install
    ```

### Running the project 🚀

-   **Development:**

    ```bash
    yarn dev
    ```

-   **Production:**

    ```bash
    yarn build && yarn start
    ```

-   **Run the project locally on mobile device or tablet:**

    ```
    yarn dev

    http://192.168.1.13:8000/ or whatever ip address the project assigns
    P.S. Watch out that your mobile/tablet device is on same network as your computer
    ```

The project will start automatically on a localhost with port 3000.

## Deployment 🗳️

### Vercel

The easiest way to deploy is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

[Docs: Next.js deployment](https://nextjs.org/docs/deployment)

### Docker

Build an image

```
docker build --build-arg NEXT_PUBLIC_VERCEL_ENV=production \
--build-arg NEXT_PUBLIC_SUPPORT_EMAIL=value \
--build-arg NEXT_PUBLIC_API_URL=value \
--build-arg NEXT_PUBLIC_ORG_ID=value \
--build-arg NEXT_PUBLIC_LOADING_DURATION=value -t someTag .
```

Run

```
 docker run -p 80:3000 someTag
```

## Environment variables ✨

This project uses environment variables to manage configuration settings. The [.env.template](.env.template) file provides a blueprint of all the necessary environment variables. Copy this file to [.env.local](.env.local) and update the values accordingly for your local development.

[Docs: Environment variables](https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables)

## Documentation

Visit https://nextjs.org/docs to view the full documentation.
