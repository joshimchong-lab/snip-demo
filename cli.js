#!/usr/bin/env node

const http = require('http');
const https = require('https');
const url = require('url');
const { exec } = require('child_process');
const { platform } = require('os');

const API_BASE = process.env.SNIP_API || 'http://localhost:3000';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new url.URL(path, API_BASE);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function openInBrowser(target) {
  const browserCmd = {
    'linux': `xdg-open "${target}"`,
    'darwin': `open "${target}"`,
    'win32': `start "" "${target}"`
  }[platform()];

  if (!browserCmd) {
    console.error(`Error: Unsupported platform for opening browser: ${platform()}`);
    process.exit(1);
  }

  exec(browserCmd, (error) => {
    if (error) {
      console.error(`Error opening browser: ${error.message}`);
      process.exit(1);
    }
  });
}

function printUsage() {
  console.log(`Snip CLI - URL shortener

Usage:
  snip add <url>    Shorten a URL
  snip ls           List all shortened links
  snip open <code>  Open a shortened link in browser
  snip help         Show this help message

Environment:
  SNIP_API          API base URL (default: http://localhost:3000)`);
}

async function handleAdd(urlArg) {
  if (!urlArg) {
    console.error('Error: URL required');
    process.exit(1);
  }

  try {
    const res = await makeRequest('POST', '/api/links', { url: urlArg });
    if (res.status !== 201) {
      const error = res.body ? JSON.parse(res.body) : {};
      console.error(`Error: ${error.message || 'Failed to shorten URL'}`);
      process.exit(1);
    }
    const data = JSON.parse(res.body);
    console.log(data.shortUrl);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

async function handleLs() {
  try {
    const res = await makeRequest('GET', '/api/links');
    if (res.status !== 200) {
      console.error('Error: Failed to fetch links');
      process.exit(1);
    }
    const links = JSON.parse(res.body);
    
    if (!links || links.length === 0) {
      console.log('No links yet.');
      return;
    }

    // Calculate column widths
    let maxCode = 4, maxHits = 4, maxUrl = 3;
    links.forEach(link => {
      maxCode = Math.max(maxCode, (link.code || '').length);
      maxHits = Math.max(maxHits, (link.hits || 0).toString().length);
      maxUrl = Math.max(maxUrl, (link.url || '').length);
    });

    // Print header
    console.log(`${'Code'.padEnd(maxCode)}  ${'Hits'.padEnd(maxHits)}  ${'URL'.padEnd(maxUrl)}`);
    console.log(`${'-'.repeat(maxCode)}  ${'-'.repeat(maxHits)}  ${'-'.repeat(maxUrl)}`);

    // Print rows
    links.forEach(link => {
      const code = (link.code || '').padEnd(maxCode);
      const hits = (link.hits || 0).toString().padEnd(maxHits);
      const uri = (link.url || '').padEnd(maxUrl);
      console.log(`${code}  ${hits}  ${uri}`);
    });
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

async function handleOpen(code) {
  if (!code) {
    console.error('Error: Code required');
    process.exit(1);
  }

  try {
    const res = await makeRequest('GET', `/${code}`, null);
    if (res.status !== 302 && res.status !== 301) {
      console.error('Error: Link not found');
      process.exit(1);
    }
    const location = res.headers.location;
    if (!location) {
      console.error('Error: Invalid redirect response');
      process.exit(1);
    }
    openInBrowser(location);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    return;
  }

  const command = args[0];

  switch (command) {
    case 'add':
      await handleAdd(args[1]);
      break;
    case 'ls':
      await handleLs();
      break;
    case 'open':
      await handleOpen(args[1]);
      break;
    default:
      console.error(`Error: Unknown command '${command}'`);
      printUsage();
      process.exit(1);
  }
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
