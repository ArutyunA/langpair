#!/usr/bin/env node

import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(rootDir, ".env.local"), quiet: true });
dotenv.config({ path: path.join(rootDir, ".env"), quiet: true });

const { Client } = pg;
const defaultBackupFile = path.resolve(
  rootDir,
  "..",
  "backups",
  "source-project-ref",
  "db_cluster-27-11-2025@22-15-07.backup",
);

const targetTables = [
  "public.daily_scenarios",
  "public.daily_scenario_phrases",
  "public.daily_scenario_prompts",
  "public.daily_vocabulary",
];

const schemaSql = `
  create extension if not exists pgcrypto;

  create table if not exists daily_scenarios (
    id uuid default gen_random_uuid() not null primary key,
    day_number integer not null,
    language text not null,
    title text not null,
    description text not null,
    your_role text not null,
    partner_role text not null,
    created_at timestamptz not null default now(),
    constraint daily_scenarios_day_language_unique unique (day_number, language)
  );

  create table if not exists daily_scenario_phrases (
    id uuid default gen_random_uuid() not null primary key,
    scenario_id uuid not null references daily_scenarios(id) on delete cascade,
    order_index integer not null,
    phrase text not null,
    translation text not null,
    romanization text,
    created_at timestamptz not null default now(),
    tts_storage_path text,
    constraint daily_scenario_phrases_unique_order unique (scenario_id, order_index)
  );

  create table if not exists daily_scenario_prompts (
    id uuid default gen_random_uuid() not null primary key,
    scenario_id uuid not null references daily_scenarios(id) on delete cascade,
    order_index integer not null,
    prompt text not null,
    created_at timestamptz not null default now(),
    constraint daily_scenario_prompts_unique_order unique (scenario_id, order_index)
  );

  create table if not exists daily_vocabulary (
    id uuid default gen_random_uuid() not null primary key,
    language text not null,
    word text not null,
    translation text not null,
    romanization text,
    date date not null default current_date,
    created_at timestamptz not null default now(),
    day_number integer not null,
    tts_bucket text,
    tts_storage_path text,
    tts_voice_id text,
    tts_last_generated_at timestamptz,
    constraint daily_vocabulary_unique_per_day unique (day_number, language, word)
  );

  create index if not exists daily_vocabulary_day_language_idx
    on daily_vocabulary (day_number, language);

  create index if not exists daily_vocabulary_tts_lookup_idx
    on daily_vocabulary (day_number, language, word);
`;

function parseArgs(argv) {
  const args = {
    backupFile: defaultBackupFile,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    switch (value) {
      case "--backup-file":
        args.backupFile = path.resolve(argv[index + 1] || "");
        index += 1;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      default:
        throw new Error(`Unknown argument: ${value}`);
    }
  }

  return args;
}

const stripSslMode = (connectionString) =>
  connectionString
    .replace("?sslmode=require", "")
    .replace("&sslmode=require", "")
    .replace("?&", "?")
    .replace(/\?$/, "");

function decodeCopyValue(value) {
  if (value === "\\N") {
    return null;
  }

  let decoded = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char !== "\\") {
      decoded += char;
      continue;
    }

    index += 1;
    const escaped = value[index];
    switch (escaped) {
      case "b":
        decoded += "\b";
        break;
      case "f":
        decoded += "\f";
        break;
      case "n":
        decoded += "\n";
        break;
      case "r":
        decoded += "\r";
        break;
      case "t":
        decoded += "\t";
        break;
      case "v":
        decoded += "\v";
        break;
      default:
        decoded += escaped ?? "";
        break;
    }
  }

  return decoded;
}

function parseCopyLine(line) {
  return line.split("\t").map(decodeCopyValue);
}

function extractCopyBlocks(content) {
  const tables = new Map();
  let currentTable = null;
  let currentColumns = [];
  let currentRows = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const copyMatch = rawLine.match(/^COPY ([^ ]+) \((.+)\) FROM stdin;$/);
    if (copyMatch) {
      currentTable = targetTables.includes(copyMatch[1]) ? copyMatch[1] : null;
      currentColumns = currentTable ? copyMatch[2].split(", ").map((column) => column.trim()) : [];
      currentRows = [];
      continue;
    }

    if (!currentTable) {
      continue;
    }

    if (rawLine === "\\.") {
      tables.set(currentTable, {
        columns: currentColumns,
        rows: currentRows,
      });
      currentTable = null;
      currentColumns = [];
      currentRows = [];
      continue;
    }

    if (rawLine.length > 0) {
      currentRows.push(parseCopyLine(rawLine));
    }
  }

  return tables;
}

function buildInsertQuery(tableName, columns, rows) {
  const placeholders = [];
  const values = [];

  rows.forEach((row, rowIndex) => {
    const tuple = row.map((_value, columnIndex) => {
      values.push(row[columnIndex]);
      return `$${rowIndex * columns.length + columnIndex + 1}`;
    });
    placeholders.push(`(${tuple.join(", ")})`);
  });

  return {
    text: `insert into ${tableName} (${columns.join(", ")}) values ${placeholders.join(", ")}`,
    values,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required in .env.local.");
  }

  const dump = await fs.readFile(args.backupFile, "utf-8");
  const copyBlocks = extractCopyBlocks(dump);

  for (const tableName of targetTables) {
    const block = copyBlocks.get(tableName);
    console.log(`${tableName}: ${block?.rows.length ?? 0} rows`);
  }

  if (args.dryRun) {
    return;
  }

  const client = new Client({
    connectionString: stripSslMode(databaseUrl),
    ssl: databaseUrl.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    await client.query("begin");
    await client.query(schemaSql);
    await client.query(
      "truncate table daily_scenario_prompts, daily_scenario_phrases, daily_vocabulary, daily_scenarios restart identity cascade",
    );

    for (const tableName of targetTables) {
      const block = copyBlocks.get(tableName);
      if (!block || block.rows.length === 0) {
        continue;
      }

      for (let index = 0; index < block.rows.length; index += 100) {
        const batch = block.rows.slice(index, index + 100);
        const insert = buildInsertQuery(tableName.replace("public.", ""), block.columns, batch);
        await client.query(insert);
      }
    }

    await client.query("commit");
    console.log("Neon import complete.");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
