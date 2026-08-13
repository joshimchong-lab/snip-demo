# Snip CLI

A zero-dependency Node.js CLI for URL shortening.

## Installation

```bash
npm install -g snip-cli
```

## Usage

### Shorten a URL
```bash
snip add <url>
```
Makes a POST request to `/api/links` with the provided URL and prints the shortened URL.

### List all links
```bash
snip ls
```
Fetches all shortened links from `/api/links` and displays them in an aligned table with columns: Code, Hits, and URL. Shows "No links yet." if empty.

### Open a shortened link
```bash
snip open <code>
```
Fetches the link with the given code (e.g., `abc123`) and opens it in your default browser. Uses system-specific commands: `start` on Windows, `open` on macOS, `xdg-open` on Linux.

### Help
```bash
snip help
snip --help
snip -h
snip
```
Display usage information.

## Environment Variables

- `SNIP_API`: Base URL for the API (default: `http://localhost:3000`)

## Exit Codes

- `0`: Success
- `1`: Error (bad input, unknown code, unreachable backend, etc.)

## Error Handling

All errors are printed to stderr and the program exits with code 1.
