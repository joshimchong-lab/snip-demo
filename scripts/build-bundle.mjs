#!/usr/bin/env node

import { spawn, spawnSync } from 'child_process';
import { copyFileSync, mkdirSync, writeFileSync, existsSync, cpSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const rootDir = resolve(__dirname, '..');
const bundleDir = join(rootDir, 'bundle');

const push = process.argv.includes('--push');

function log(msg) {
  console.log(`[build-bundle] ${msg}`);
}

function error(msg) {
  console.error(`[build-bundle] ERROR: ${msg}`);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  const { useShell = cmd === 'npm' || cmd === 'ng' } = opts;
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: useShell,
    ...opts,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    error(`Command failed: ${cmd} ${args.join(' ')}`);
  }
  return result;
}

async function hasStagedChanges(cwd) {
  const result = spawnSync('git', ['diff', '--cached', '--quiet'], {
    cwd,
    stdio: 'pipe',
  });
  return result.status !== 0; // exit code 0 means no diff (no changes)
}

async function main() {
  log('Starting bundle build...');

  // Step 1: Update submodules to branch tips
  log('Updating submodules to branch tips...');
  run('git', ['submodule', 'update', '--init', '--remote', 'backend', 'frontend', 'cli'], { cwd: rootDir });

  // Step 2: Build frontend
  log('Building frontend...');
  run('npm', ['install'], { cwd: join(rootDir, 'frontend') });
  
  const ngPath = join(rootDir, 'frontend', 'node_modules', '.bin', 'ng');
  run(ngPath, ['build'], { cwd: join(rootDir, 'frontend') });

  const frontendDist = join(rootDir, 'frontend', 'dist', 'snip-frontend', 'browser', 'index.html');
  if (!existsSync(frontendDist)) {
    error(`Frontend build artifact missing: ${frontendDist}`);
  }
  log('✓ Frontend build complete');

  // Step 3: Assemble bundle/
  log('Assembling bundle...');
  
  // Copy backend/server.js
  const backendServer = join(rootDir, 'backend', 'server.js');
  copyFileSync(backendServer, join(bundleDir, 'server.js'));
  log('✓ Copied backend/server.js');

  // Copy cli/cli.js
  const cliJs = join(rootDir, 'cli', 'cli.js');
  copyFileSync(cliJs, join(bundleDir, 'cli.js'));
  log('✓ Copied cli/cli.js');

  // Copy frontend build output
  const publicDir = join(bundleDir, 'public');
  const frontendBuildSrc = join(rootDir, 'frontend', 'dist', 'snip-frontend', 'browser');
  if (existsSync(publicDir)) {
    rmSync(publicDir, { recursive: true, force: true });
  }
  cpSync(frontendBuildSrc, publicDir, { recursive: true });
  log('✓ Copied frontend build to bundle/public');

  // Write .env
  writeFileSync(join(bundleDir, '.env'), 'PUBLIC_DIR=./public\n');
  log('✓ Created .env');

  // Write package.json
  const packageJson = {
    name: 'snip-bundle',
    version: '1.0.0',
    description: 'Snip URL shortener - bundled deployment',
    scripts: {
      start: 'bun server.js',
    },
    keywords: ['url', 'shortener'],
  };
  writeFileSync(join(bundleDir, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');
  log('✓ Created package.json');

  // Write Dockerfile
  const dockerfile = `FROM oven/bun:1-alpine
WORKDIR /app
COPY . .
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "server.js"]
`;
  writeFileSync(join(bundleDir, 'Dockerfile'), dockerfile);
  log('✓ Created Dockerfile');

  // Write .dockerignore
  const dockerignore = `node_modules/
.git/
.gitmodules
backend/
cli/
frontend/
scripts/
.env.local
*.log
.DS_Store
`;
  writeFileSync(join(bundleDir, '.dockerignore'), dockerignore);
  log('✓ Created .dockerignore');

  // Write railway.json
  const railwayJson = {
    $schema: 'https://railway.app/railway.schema.json',
    build: {
      builder: 'DOCKERFILE',
    },
    deploy: {
      startCommand: 'bun server.js',
      restartPolicyMaxRetries: 5,
      restartPolicyWindowMs: 60000,
    },
  };
  writeFileSync(join(bundleDir, 'railway.json'), JSON.stringify(railwayJson, null, 2) + '\n');
  log('✓ Created railway.json');

  // Step 4: Commit bundle changes (guarded)
  log('Staging bundle changes...');
  run('git', ['add', '.'], { cwd: bundleDir });

  if (await hasStagedChanges(bundleDir)) {
    log('Found changes in bundle, committing...');
    run('git', ['commit', '-m', 'Update bundle artifacts'], { cwd: bundleDir });
    log('✓ Bundle committed');
  } else {
    log('No changes in bundle, skipping commit');
  }

  // Step 5: Bump submodule pointers in superproject (guarded)
  log('Updating submodule pointers in superproject...');
  run('git', ['add', 'bundle'], { cwd: rootDir });

  if (await hasStagedChanges(rootDir)) {
    log('Found submodule pointer changes, committing...');
    run('git', ['commit', '-m', 'Bump bundle submodule pointer'], { cwd: rootDir });
    log('✓ Superproject committed');
  } else {
    log('No submodule pointer changes, skipping commit');
  }

  // Step 6: Push if --push flag
  if (push) {
    log('Pushing bundle branch...');
    run('git', ['push', 'origin', 'HEAD:bundle'], { cwd: bundleDir });
    log('✓ Bundle branch pushed');

    log('Pushing main branch...');
    run('git', ['push', 'origin', 'main'], { cwd: rootDir });
    log('✓ Main branch pushed');
  } else {
    log('Skipping push (use --push to push changes)');
  }

  log('✓ Bundle build complete!');
}

main().catch(err => {
  error(err.message || err);
});
