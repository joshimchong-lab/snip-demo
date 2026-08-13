#!/usr/bin/env node

const { spawn } = require("node:child_process");

const API_BASE = process.env.SNIP_API || "http://localhost:3000";

function usage() {
  console.log(`snip - tiny URL shortener CLI

Usage:
  snip add <url>    Create a short link and print shortUrl
  snip ls           List links as aligned code/hits/url table
  snip open <code>  Resolve code and open destination in your browser
  snip help         Show this help

Environment:
  SNIP_API          Backend base URL (default: http://localhost:3000)`);
}

function exitWithError(message) {
  console.error(message);
  process.exit(1);
}

function parseHttpUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

async function requestJson(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch (err) {
    exitWithError(`Cannot reach backend at ${API_BASE}: ${err.message}`);
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message = body && body.error ? body.error : `Request failed with status ${response.status}`;
    exitWithError(message);
  }

  return body;
}

async function cmdAdd(url) {
  const parsed = parseHttpUrl(url);
  if (!parsed) {
    exitWithError("Invalid URL. Use http:// or https://");
  }

  const data = await requestJson("/api/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: parsed.toString() }),
  });

  if (!data || !data.shortUrl) {
    exitWithError("Backend response missing shortUrl");
  }

  console.log(data.shortUrl);
}

function pad(text, width) {
  return String(text).padEnd(width, " ");
}

async function cmdList() {
  const links = await requestJson("/api/links");

  if (!Array.isArray(links) || links.length === 0) {
    console.log("No links yet.");
    return;
  }

  const codeWidth = Math.max("code".length, ...links.map((item) => String(item.code || "").length));
  const hitsWidth = Math.max("hits".length, ...links.map((item) => String(item.hits ?? "").length));

  console.log(`${pad("code", codeWidth)}  ${pad("hits", hitsWidth)}  url`);
  for (const link of links) {
    console.log(`${pad(link.code, codeWidth)}  ${pad(link.hits, hitsWidth)}  ${link.url}`);
  }
}

function detectOpenCommand() {
  if (process.platform === "win32") {
    return { command: "cmd", args: ["/c", "start", "", "%URL%"] };
  }
  if (process.platform === "darwin") {
    return { command: "open", args: ["%URL%"] };
  }
  return { command: "xdg-open", args: ["%URL%"] };
}

function openInBrowser(targetUrl) {
  const opener = detectOpenCommand();
  const args = opener.args.map((arg) => (arg === "%URL%" ? targetUrl : arg));

  return new Promise((resolve, reject) => {
    const child = spawn(opener.command, args, {
      stdio: "ignore",
      detached: process.platform !== "win32",
    });

    child.on("error", reject);
    child.on("spawn", () => {
      if (process.platform !== "win32") {
        child.unref();
      }
      resolve();
    });
  });
}

async function cmdOpen(code) {
  if (!code) {
    exitWithError("Missing code. Usage: snip open <code>");
  }

  let response;
  try {
    response = await fetch(`${API_BASE}/${encodeURIComponent(code)}`, {
      method: "GET",
      redirect: "manual",
    });
  } catch (err) {
    exitWithError(`Cannot reach backend at ${API_BASE}: ${err.message}`);
  }

  if (response.status === 404) {
    exitWithError("Unknown short code");
  }

  if (response.status < 300 || response.status >= 400) {
    exitWithError(`Expected redirect, got status ${response.status}`);
  }

  const location = response.headers.get("location");
  if (!location) {
    exitWithError("Redirect missing Location header");
  }

  try {
    await openInBrowser(location);
  } catch (err) {
    exitWithError(`Could not open browser: ${err.message}`);
  }

  console.log(location);
}

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    usage();
    return;
  }

  if (command === "add") {
    if (!arg) {
      exitWithError("Missing URL. Usage: snip add <url>");
    }
    await cmdAdd(arg);
    return;
  }

  if (command === "ls") {
    await cmdList();
    return;
  }

  if (command === "open") {
    await cmdOpen(arg);
    return;
  }

  exitWithError(`Unknown command: ${command}`);
}

main().catch((err) => {
  exitWithError(err && err.message ? err.message : "Unknown error");
});
