import cors from "cors";
import express from "express";
import path from "node:path";
import { env } from "./env.js";
import { pool } from "./db.js";
import { getDailyVocabulary, getDayOverview, getScenarioDetail } from "./data.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use(
  "/audio",
  express.static(env.audioRoot, {
    extensions: ["wav", "mp3"],
    fallthrough: false,
  }),
);

const VALID_LANGUAGES = new Set(["russian", "cantonese"]);

const parseDayNumber = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("select 1");
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false });
  }
});

app.get("/api/day/:dayNumber/overview", async (req, res) => {
  const dayNumber = parseDayNumber(req.params.dayNumber);
  const language = req.query.language;

  if (!dayNumber) {
    res.status(400).json({ error: "Invalid day number." });
    return;
  }

  if (typeof language !== "string" || !VALID_LANGUAGES.has(language)) {
    res.status(400).json({ error: "Invalid language." });
    return;
  }

  try {
    const payload = await getDayOverview(dayNumber, language);
    res.json(payload);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load overview." });
  }
});

app.get("/api/day/:dayNumber/vocabulary", async (req, res) => {
  const dayNumber = parseDayNumber(req.params.dayNumber);
  const language = req.query.language;

  if (!dayNumber) {
    res.status(400).json({ error: "Invalid day number." });
    return;
  }

  if (typeof language !== "string" || !VALID_LANGUAGES.has(language)) {
    res.status(400).json({ error: "Invalid language." });
    return;
  }

  try {
    const vocabulary = await getDailyVocabulary(dayNumber, language);
    res.json({ dayNumber, language, vocabulary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load vocabulary." });
  }
});

app.get("/api/scenarios/:scenarioId", async (req, res) => {
  try {
    const payload = await getScenarioDetail(req.params.scenarioId);
    if (!payload) {
      res.status(404).json({ error: "Scenario not found." });
      return;
    }
    res.json(payload);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load scenario." });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.listen(env.port, () => {
  console.log(`LangPair API listening on http://localhost:${env.port}`);
  console.log(`Audio root: ${path.relative(env.rootDir, env.audioRoot)}`);
});
