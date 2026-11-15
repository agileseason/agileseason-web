# AgileSeason
> [web]

## Setup

Make sure to install dependencies:

```bash
pnpm install
```

## Development Server

Start the development server on `http://localhost:3300`:

```bash
pnpm dev -p 3300
```

### .env

#### Web only, create `.env.example`

```
NUXT_PUBLIC_API_MODE=mock
NUXT_PUBLIC_API_URL=
```

## Production

Build the application for production:

```bash
pnpm build
```

Locally preview production build:

```bash
pnpm preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
