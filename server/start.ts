import "dotenv/config";
import { createProxyMiddleware } from "http-proxy-middleware";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import app from "./index";

const isDevelopment = process.env.NODE_ENV !== "production";
const vitePort = parseInt(process.env.VITE_PORT || "5173", 10);

if (isDevelopment) {
  app.use(
    "/",
    createProxyMiddleware({
      target: `http://localhost:${vitePort}`,
      changeOrigin: true,
      ws: true,
    }),
  );
} else {
  const distPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
  app.use(express.static(distPath));
  app.get(/(.*)/, (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const port = parseInt(process.env.PORT || "5000", 10);
app.listen(port, "0.0.0.0", () => {
  console.log(`Apexium server running on port ${port}`);
  if (isDevelopment) console.log(`Proxying frontend from Vite on port ${vitePort}`);
  console.log(`Google AI Key: ${process.env.GOOGLE_API_KEY ? "✓ configured" : "✗ MISSING"}`);
  console.log(`Database: ${process.env.DATABASE_URL ? "✓ configured" : "✗ MISSING"}`);
  console.log(
    `Supabase Auth: ${
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL ? "✓ configured" : "✗ MISSING"
    }`,
  );
});