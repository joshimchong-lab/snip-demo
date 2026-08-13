# snip-backend

Tiny Bun backend for Snip URL shortener.

## Run

Prerequisite: Bun 1.x

```bash
bun start
```

## API

- `POST /api/links` with `{ "url": "https://example.com" }`
  - `201` returns `{ code, url, shortUrl, hits, createdAt }`
  - `400` on invalid JSON or invalid URL
- `GET /api/links` returns all links
- `GET /:code` redirects (`302`) and increments `hits`; `404` when unknown

## Environment

- `PORT` (default `3000`)
- `BASE_URL` (origin used for `shortUrl`)
- `RAILWAY_PUBLIC_DOMAIN` (used as `https://$RAILWAY_PUBLIC_DOMAIN` when `BASE_URL` is unset)
- `PUBLIC_DIR` (optional static file directory)
