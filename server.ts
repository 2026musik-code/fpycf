import express from "express";
import { getRequestListener } from "@hono/node-server";
import path from "path";
import { createServer as createViteServer } from "vite";
import app from "./src/app.js";

async function startServer() {
  const PORT = 3000;
  const expressApp = express();
  const honoListener = getRequestListener(app.fetch);

  expressApp.use((req, res, next) => {
    if (req.url?.startsWith("/api")) {
      honoListener(req, res);
    } else {
      next();
    }
  });

  if (process.env.NODE_ENV !== "production") {
    // Development mode: Vite and Hono together
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    expressApp.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), "dist");
    expressApp.use(express.static(distPath));
    expressApp.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  expressApp.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
