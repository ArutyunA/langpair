import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(rootDir, ".env.local"), quiet: true });
dotenv.config({ path: path.join(rootDir, ".env"), quiet: true });

export const env = {
  audioRoot: path.resolve(rootDir, "..", "backups", "source-project-ref", "TTSCanto"),
  databaseUrl: process.env.DATABASE_URL ?? "",
  port: Number(process.env.PORT ?? 3000),
  rootDir,
};

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is required. Put it in .env.local before starting the API.");
}

export const stripSslMode = (connectionString) =>
  connectionString
    .replace("?sslmode=require", "")
    .replace("&sslmode=require", "")
    .replace("?&", "?")
    .replace(/\?$/, "");
