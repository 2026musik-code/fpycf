import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

const cache = new Map<string, { timestamp: number, data: any }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

app.get("/api/proxy", async (c) => {
  try {
    const apiKey = c.req.header("x-api-key");
    if (!apiKey) {
      return c.json({ error: "Missing API Key" }, 401);
    }

    const action = c.req.query("action");
    const id = c.req.query("id");
    const provider = c.req.query("provider") || "reelshort";

    const cacheKey = `${provider}_${action}_${id || ''}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return c.json(cached.data);
    }

    let url = `https://www.cutad.web.id/api/public/${provider}?action=${action}`;
    if (id) {
      url += `&id=${encodeURIComponent(id)}`;
    }

    const response = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
      },
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return c.json({ error: "Invalid response from upstream API", details: text }, 500);
    }
    
    cache.set(cacheKey, { timestamp: Date.now(), data });
    return c.json(data, response.status as any);
  } catch (error: any) {
    console.error("Error proxying request:", error);
    return c.json({ error: "Failed to proxy request", details: error.message }, 500);
  }
});

app.get("/api/videos", async (c) => {
  try {
    const apiKey = c.req.header("x-api-key");
    if (!apiKey) {
      return c.json({ error: "Missing API Key" }, 401);
    }

    const provider = c.req.query("provider") || "reelshort";
    const cacheKey = `videos_rank_${provider}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return c.json(cached.data);
    }

    const response = await fetch(`https://www.cutad.web.id/api/public/${provider}?action=rank`, {
      headers: {
        "x-api-key": apiKey,
      },
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON from cutad API:", text);
      return c.json({ error: "Invalid response from upstream API", details: text }, 500);
    }
    
    cache.set(cacheKey, { timestamp: Date.now(), data });
    return c.json(data, response.status as any);
  } catch (error: any) {
    console.error("Error fetching videos:", error);
    return c.json({ error: "Failed to proxy request", details: error.message }, 500);
  }
});

app.get("/api/cors-proxy", async (c) => {
  const targetUrl = c.req.query("url");
  let referer = c.req.query("referer");
  if (!targetUrl) return c.text("No url provided", 400);

  try {
    const urlObj = new URL(targetUrl);
    if (!referer) referer = urlObj.origin;
    
    const response = await fetch(targetUrl, {
      headers: {
        "Origin": new URL(referer).origin,
        "Referer": referer,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    const contentType = response.headers.get("content-type");
    
    c.header("Access-Control-Allow-Origin", "*");
    if (contentType) c.header("Content-Type", contentType);

    if (targetUrl.includes(".m3u8") || (contentType && contentType.includes("mpegurl"))) {
      let text = await response.text();
      
      // Rewrite standalone relative paths
      text = text.replace(/^[ \t]*(?!#|http)[ \t]*(.+)[ \t]*$/gm, (match, path) => {
        const absoluteUrl = new URL(path.trim(), targetUrl).toString();
        return `/api/cors-proxy?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer!)}`;
      });
      
      // Rewrite URI="..."
      text = text.replace(/URI="([^"]+)"/g, (match, path) => {
        if (path.startsWith("http")) {
          return `URI="/api/cors-proxy?url=${encodeURIComponent(path)}&referer=${encodeURIComponent(referer!)}"`;
        }
        const absoluteUrl = new URL(path, targetUrl).toString();
        return `URI="/api/cors-proxy?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer!)}"`;
      });
      
      // Force rewrite any bare URI values
      return c.text(text);
    } else {
      const arrayBuffer = await response.arrayBuffer();
      return c.body(arrayBuffer);
    }
  } catch (error: any) {
    console.error("CORS Proxy Error:", error);
    return c.text("Proxy error", 500);
  }
});

app.get("/api/subtitle-proxy", async (c) => {
  const targetUrl = c.req.query("url");
  if (!targetUrl) return c.text("No url provided", 400);
  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });
    let text = await response.text();
    
    if (!text.trim().startsWith("WEBVTT")) {
       text = "WEBVTT\n\n" + text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
    }
    
    c.header("Content-Type", "text/vtt; charset=utf-8");
    c.header("Access-Control-Allow-Origin", "*");
    return c.text(text);
  } catch(err) {
    return c.text("Subtitle error", 500);
  }
});

export default app;
