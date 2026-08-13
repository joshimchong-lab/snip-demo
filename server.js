const { isAbsolute, join, normalize, relative, resolve } = require("node:path");

const links = new Map();
const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

const port = Number(process.env.PORT || 3000);
const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
const baseUrl = process.env.BASE_URL || (railwayDomain ? `https://${railwayDomain}` : `http://localhost:${port}`);
const publicDir = process.env.PUBLIC_DIR ? resolve(process.env.PUBLIC_DIR) : null;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function withCors(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function json(data, status = 200) {
  return withCors(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function generateCode() {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    const index = Math.floor(Math.random() * BASE62.length);
    code += BASE62[index];
  }
  return code;
}

function createUniqueCode() {
  for (let attempts = 0; attempts < 1000; attempts += 1) {
    const code = generateCode();
    if (!links.has(code)) {
      return code;
    }
  }
  throw new Error("Failed to generate a unique code");
}

async function tryServeStatic(pathname) {
  if (!publicDir) {
    return null;
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.replace(/^\/+/, "");
  const candidate = normalize(join(publicDir, relativePath));
  const rel = relative(publicDir, candidate);

  if (rel.startsWith("..") || isAbsolute(rel)) {
    return null;
  }

  const file = Bun.file(candidate);
  if (!(await file.exists())) {
    return null;
  }

  return withCors(new Response(file));
}

const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname } = url;

    if (req.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    if (req.method === "POST" && pathname === "/api/links") {
      let body;
      try {
        body = await req.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
      if (!isValidHttpUrl(rawUrl)) {
        return json({ error: "URL must start with http:// or https://" }, 400);
      }

      const code = createUniqueCode();
      const link = {
        code,
        url: rawUrl,
        shortUrl: `${baseUrl}/${code}`,
        hits: 0,
        createdAt: new Date().toISOString(),
      };

      links.set(code, link);
      return json(link, 201);
    }

    if (req.method === "GET" && pathname === "/api/links") {
      return json(Array.from(links.values()));
    }

    if (req.method === "GET") {
      const staticResponse = await tryServeStatic(pathname);
      if (staticResponse) {
        return staticResponse;
      }

      const code = pathname.slice(1);
      const link = links.get(code);
      if (!link) {
        return json({ error: "Not found" }, 404);
      }

      link.hits += 1;
      return withCors(
        Response.redirect(link.url, 302)
      );
    }

    return json({ error: "Method not allowed" }, 405);
  },
});

console.log(`Snip backend running at ${baseUrl} (listening on :${server.port})`);
