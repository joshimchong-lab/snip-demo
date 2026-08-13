# snip-cli

Zero-dependency Node CLI for the Snip backend.

## Commands

- `snip add <url>`: create a short link and print `shortUrl`
- `snip ls`: list all links as `code / hits / url`
- `snip open <code>`: resolve code with manual redirect and open target URL in your browser
- `snip help`: print usage

## Environment

- `SNIP_API`: backend base URL (default `http://localhost:3000`)

## Run

```bash
node cli.js help
```
