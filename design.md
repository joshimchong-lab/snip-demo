# Snip Design Tokens

A compact, dark visual system inspired by modern AI chat-product landing pages.

## Palette
- `--bg-950`: `#08090d` (page background)
- `--bg-900`: `#0f1118` (shell surface)
- `--bg-850`: `#161926` (nested card/input surface)
- `--border-soft`: `rgba(255, 255, 255, 0.12)`
- `--text-strong`: `#f7f8fb`
- `--text-muted`: `#a7afc2`
- `--ok`: `#88f5bf`
- `--danger`: `#ff9a9a`

## Accent Gradient
- `--glow-warm`: `radial-gradient(60% 130% at 50% 0%, rgba(255, 138, 101, 0.38) 0%, rgba(255, 107, 136, 0.22) 40%, rgba(255, 92, 92, 0) 75%)`
- Must live in a fixed, full-width top band: `position: fixed; left: 0; right: 0; pointer-events: none;`.

## Typography
- Font stack: `"Sora", "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif`
- Hero title: clamp(2.1rem, 5.5vw, 3.4rem), 700, tight letter spacing
- Body: ~1rem
- Muted support text: ~0.95rem

## Spacing + Shape
- Page padding: `clamp(18px, 4vw, 44px)`
- Shell width: `min(960px, 100%)`
- Card radius: 22px
- Input pill radius: 999px
- Internal gaps: 10px, 16px, 24px, 32px

## Borders, Shadows, Glow
- Soft border for cards and controls: `1px solid var(--border-soft)`
- Shell/card shadow: `0 20px 50px rgba(0, 0, 0, 0.45)`
- Inner highlight: subtle top inset light line on major surfaces

## Element Mapping
- Page header => hero block with centered title/subline
- URL form => chat-style pill input with attached action
- Success/error lines => compact rounded notices
- Links table => rounded card with subtle grid lines and muted headers
