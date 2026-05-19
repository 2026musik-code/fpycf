import { serve } from "@hono/node-server";
import { getRequestListener } from "@hono/node-server";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import app from "./src/app.js"; // Note the .js extension so typescript module resolution in ESM works fine, but wait our build tool handles it. We can just use "./src/app" in vite/esbuild usually. Just going to use exactly what works.

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    // Development mode: Vite and Hono together
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    const honoListener = getRequestListener(app.fetch);

    const server = http.createServer((req, res) => {
      // Pass /api requests directly to Hono
      if (req.url?.startsWith("/api")) {
        honoListener(req, res);
      } else {
        // Fallback to Vite to serve SPA
        vite.middlewares(req, res, () => {
          res.statusCode = 404;
          res.end("Not Found");
        });
      }
    });

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Development Server running on http://localhost:${PORT}`);
    });
  } else {
    // Production mode
    const express = (await import("express")).default;
    const expressApp = express();
    const honoListener = getRequestListener(app.fetch);
    
    expressApp.use((req, res, next) => {
      if (req.url?.startsWith("/api")) {
        honoListener(req, res);
      } else {
        next();
      }
    });

    const distPath = path.join(process.cwd(), "dist");
    expressApp.use(express.static(distPath));
    expressApp.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });

    expressApp.listen(PORT, "0.0.0.0", () => {
      console.log(`Production Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();
