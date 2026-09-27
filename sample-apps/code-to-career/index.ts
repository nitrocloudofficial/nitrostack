import "dotenv/config";
import express, { Request, Response } from "express";
import { getUserContext } from "./resources/userContext.js";

const app = express();
const PORT = 3001;

// ── Resource endpoint ─────────────────────────────────────────────────────────
// Accepts: GET /resource?uri=resource://mentor/user_context/{userId}
// Returns: UserContextResult JSON
app.get("/resource", async (req: Request, res: Response) => {
  const uri = req.query.uri as string;

  if (!uri) {
    res.status(400).json({ error: "Missing ?uri= parameter" });
    return;
  }

  // Parse userId from resource://mentor/user_context/{userId}
  const match = uri.match(/^resource:\/\/mentor\/user_context\/(.+)$/);
  if (!match) {
    res.status(400).json({ error: "Invalid resource URI format" });
    return;
  }

  const userId = match[1];
  const context = await getUserContext(userId);
  res.json(context);
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[mentor-context] Ready.`);
  console.log(`[mentor-context] Resource: resource://mentor/user_context/{userId}`);
  console.log(`[mentor-context] Endpoint: http://localhost:${PORT}/resource?uri=resource://mentor/user_context/{userId}`);
});
