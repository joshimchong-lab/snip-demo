# Snip: One Backend, Two Clients

A modular URL shortener built as a monorepo split across git branches. Three independent layers—each with its own business logic, tech stack, and submodule—work together via a REST API contract.

## Architecture: One Backend, Two Clients

```
┌─────────────────────────────────────────┐
│         Snip Backend (Node.js)          │
│       PostgreSQL + Express + REST       │
│  POST /api/links | GET /api/links       │
│   GET /:code (redirect) | DELETE ops    │
└─────────────────────────────────────────┘
            ▲                    ▲
            │                    │
    ┌───────┘                    └──────┐
    │                                   │
┌─────────────────┐        ┌──────────────────┐
│ Frontend (Web)  │        │  CLI (Terminal)  │
│ Angular + RxJS  │        │   CommonJS Node  │
│ SPA @ :4200     │        │ TypeScript (:3k) │
│ Styled UI       │        │ Commands: add/ls │
└─────────────────┘        │     open/:code   │
                           └──────────────────┘
```

## API Contract

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| POST | `/api/links` | Create shortened link | `{ "url": "..." }` | `{ "code": "abc123", "shortUrl": "http://localhost:3000/abc123" }` (201) |
| GET | `/api/links` | List all links | — | `[{ "code": "abc123", "url": "...", "hits": 5 }, ...]` (200) |
| GET | `/:code` | Redirect to original | — | Location header (302/301) |
| DELETE | `/api/links/:code` | Remove link | — | `{ "message": "Deleted" }` (200) |

## Repository Layout: Branch-per-Layer + Submodules

This monorepo uses git branches to separate concerns:

```
snip-demo (superproject, main branch)
├── backend/          → git submodule tracking 'backend' branch
│   ├── server.js
│   ├── db.js
│   ├── package.json
│   └── README.md
├── frontend/         → git submodule tracking 'frontend' branch
│   ├── angular.json
│   ├── src/
│   ├── package.json
│   └── README.md
├── cli/              → git submodule tracking 'cli' branch
│   ├── cli.js
│   ├── package.json
│   ├── snip (shell wrapper)
│   ├── snip.cmd (batch wrapper)
│   ├── snip.ps1 (PowerShell wrapper)
│   └── README.md
└── README.md         → This file
```

Each submodule:
- Lives in its own isolated branch
- Has its own commit history
- Can be updated independently
- Pointed to by a commit reference in the superproject

## Cloning the Full Project

To clone and populate all submodules in one step:

```bash
git clone --recurse-submodules https://github.com/joshimchong-lab/snip-demo.git
cd snip-demo
```

**Plain clones leave submodule folders empty.** If you've already cloned without `--recurse-submodules`, initialize them:

```bash
git submodule update --init --recursive
```

## Running All Three Pieces

### 1. Backend (Node.js + PostgreSQL)

```bash
cd backend
npm install
npm start
# Server runs at http://localhost:3000
```

### 2. Frontend (Angular SPA)

```bash
cd frontend
npm install
npm start
# Opens at http://localhost:4200
```

### 3. CLI (Terminal / Node.js)

```bash
cd cli
npm install
# Global install (development mode)
npm link

# Or run directly
node cli.js add https://example.com
node cli.js ls
node cli.js open abc123
```

All three pieces communicate via REST at the shared API endpoint (default: `http://localhost:3000`).

## Update Workflow

To update a submodule and sync the superproject:

### Step 1: Commit inside the submodule

```bash
cd backend
git add .
git commit -m "Fix bug in link model"
git push origin backend
```

### Step 2: Update the submodule reference in superproject

```bash
cd ..  # back to root
git submodule update --remote backend
git add backend
git commit -m "Bump backend pointer"
git push origin main
```

### Full sync for all submodules

```bash
git submodule update --remote
git add backend frontend cli
git commit -m "Update all submodules to latest"
git push origin main
```

## Development & Iteration

1. **Work in isolation:** Each layer can be developed, tested, and deployed independently.
2. **Shared API:** The contract (above) is the interface.
3. **Branch protection:** Each branch can have its own CI/CD, linting, and testing.
4. **Easy debugging:** Clone just one layer into a separate directory if needed.

## Common Tasks

### List submodule status
```bash
git submodule status
```

### See which branch each submodule is tracking
```bash
git config --file .gitmodules -l
```

### Pull latest for all submodules
```bash
git pull --recurse-submodules
```

### Remove a submodule (if needed)
```bash
git rm backend
git commit -m "Remove backend submodule"
```

---

For details on each layer, see the README in its subdirectory.
