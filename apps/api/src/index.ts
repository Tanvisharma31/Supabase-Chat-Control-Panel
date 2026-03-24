import express from "express";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
import { conversationRouter } from "./routes/conversationRoutes.js";
import { governanceRouter } from "./routes/governanceRoutes.js";
import { projectRouter } from "./routes/projectRoutes.js";
import { workspaceRouter } from "./routes/workspaceRoutes.js";
import { authRouter } from "./routes/authRoutes.js";

const app = express();

const corsExtraOrigins =
  process.env.CORS_ORIGIN?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];
const corsStaticAllow = new Set<string>([
  "https://supabase-chat-control-panel-web.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...corsExtraOrigins
]);

function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (corsStaticAllow.has(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    if (hostname.endsWith(".vercel.app")) return true;
  } catch {
    /* ignore malformed Origin */
  }
  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      callback(null, isAllowedCorsOrigin(origin));
    },
    allowedHeaders: ["Authorization", "Content-Type"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 86_400
  })
);
app.use(express.json());

app.get("/health", (_, response) => {
  response.json({ ok: true, service: "api" });
});

app.use("/auth", authRouter);
app.use("/workspaces", workspaceRouter);
app.use("/workspaces/:workspaceId/projects", projectRouter);
app.use("/workspaces/:workspaceId/conversations", conversationRouter);
app.use("/workspaces/:workspaceId/governance", governanceRouter);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});
