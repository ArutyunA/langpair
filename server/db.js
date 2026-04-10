import { Pool } from "pg";
import { env, stripSslMode } from "./env.js";

const ssl = env.databaseUrl.includes("sslmode=require")
  ? { rejectUnauthorized: false }
  : undefined;

export const pool = new Pool({
  connectionString: stripSslMode(env.databaseUrl),
  ssl,
});
