#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultSourceDir = path.resolve(
  repoRoot,
  "..",
  "backups",
  "source-project-ref",
  "TTSCanto",
);

function parseArgs(argv) {
  const args = {
    bucket: "TTSCanto",
    concurrency: 4,
    dryRun: false,
    projectUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    sourceDir: defaultSourceDir,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    switch (value) {
      case "--project-url":
        args.projectUrl = argv[index + 1] || "";
        index += 1;
        break;
      case "--service-role-key":
        args.serviceRoleKey = argv[index + 1] || "";
        index += 1;
        break;
      case "--source-dir":
        args.sourceDir = path.resolve(argv[index + 1] || "");
        index += 1;
        break;
      case "--bucket":
        args.bucket = argv[index + 1] || args.bucket;
        index += 1;
        break;
      case "--concurrency":
        args.concurrency = Number(argv[index + 1] || args.concurrency);
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

async function collectFiles(rootDir) {
  const results = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
      } else if (entry.isFile()) {
        results.push(entryPath);
      }
    }
  }

  await walk(rootDir);
  return results;
}

function inferContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".wav") return "audio/wav";
  if (extension === ".mp3") return "audio/mpeg";
  if (extension === ".json") return "application/json";
  if (extension === ".txt") return "text/plain";
  return "application/octet-stream";
}

async function uploadOne(client, bucket, sourceRoot, filePath) {
  const relativePath = path.relative(sourceRoot, filePath).split(path.sep).join("/");
  const bytes = await fs.readFile(filePath);
  const { error } = await client.storage.from(bucket).upload(relativePath, bytes, {
    contentType: inferContentType(filePath),
    upsert: true,
  });

  if (error) {
    throw new Error(`${relativePath}: ${error.message}`);
  }

  return relativePath;
}

async function runPool(files, concurrency, worker) {
  let index = 0;
  const results = [];

  async function runner() {
    while (index < files.length) {
      const nextIndex = index;
      index += 1;
      results[nextIndex] = await worker(files[nextIndex], nextIndex);
    }
  }

  const poolSize = Math.max(1, Math.min(concurrency, files.length || 1));
  await Promise.all(Array.from({ length: poolSize }, () => runner()));
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.projectUrl || !args.serviceRoleKey) {
    throw new Error(
      "project URL and service role key are required. Pass --project-url / --service-role-key or set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const sourceDirStat = await fs.stat(args.sourceDir).catch(() => null);
  if (!sourceDirStat?.isDirectory()) {
    throw new Error(`Storage source directory not found: ${args.sourceDir}`);
  }

  const files = await collectFiles(args.sourceDir);
  console.log(`Bucket: ${args.bucket}`);
  console.log(`Source directory: ${args.sourceDir}`);
  console.log(`Files discovered: ${files.length}`);

  if (files.length === 0) {
    return;
  }

  if (args.dryRun) {
    for (const filePath of files.slice(0, 20)) {
      const relativePath = path.relative(args.sourceDir, filePath).split(path.sep).join("/");
      console.log(`[dry-run] ${relativePath}`);
    }
    if (files.length > 20) {
      console.log(`[dry-run] ... ${files.length - 20} more files`);
    }
    return;
  }

  const client = createClient(args.projectUrl, args.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let completed = 0;
  await runPool(files, args.concurrency, async (filePath) => {
    const relativePath = await uploadOne(client, args.bucket, args.sourceDir, filePath);
    completed += 1;
    console.log(`[${completed}/${files.length}] uploaded ${relativePath}`);
    return relativePath;
  });

  console.log(`Uploaded ${files.length} files to ${args.bucket}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
