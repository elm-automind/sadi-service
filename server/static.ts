import express, { type Express, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export function serveStatic(app: Express) {
  // Handle both ESM and CJS contexts for __dirname
  let currentDir: string;
  try {
    // ESM context
    currentDir = path.dirname(fileURLToPath(import.meta.url));
  } catch {
    // CJS context (bundled by esbuild)
    currentDir = __dirname;
  }
  
  const distPath = path.resolve(currentDir, "public");
  
  console.log(`[static] Current directory: ${currentDir}`);
  console.log(`[static] Dist path: ${distPath}`);
  console.log(`[static] Dist path exists: ${fs.existsSync(distPath)}`);
  
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static files
  app.use(express.static(distPath));

  // SPA fallback - serve index.html for all non-API routes that don't match static files
  app.get("*", (req: Request, res: Response, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    
    const indexPath = path.resolve(distPath, "index.html");
    console.log(`[static] SPA fallback for ${req.path}, serving: ${indexPath}`);
    
    // For all other routes, serve the SPA
    res.sendFile(indexPath);
  });
}
