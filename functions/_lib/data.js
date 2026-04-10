import { neon } from "@neondatabase/serverless";

const VALID_LANGUAGES = new Set(["russian", "cantonese"]);
const clients = new Map();

const mapVocabularyRow = (row) => ({
  createdAt: row.created_at,
  dayNumber: row.day_number,
  language: row.language,
  romanization: row.romanization,
  translation: row.translation,
  ttsBucket: row.tts_bucket,
  ttsLastGeneratedAt: row.tts_last_generated_at,
  ttsStoragePath: row.tts_storage_path,
  ttsVoiceId: row.tts_voice_id,
  word: row.word,
});

const attachScenarioChildren = (scenarioRows, phraseRows, promptRows) => {
  const phrasesByScenario = new Map();
  const promptsByScenario = new Map();

  for (const phrase of phraseRows) {
    const current = phrasesByScenario.get(phrase.scenario_id) ?? [];
    current.push({
      id: phrase.id,
      orderIndex: phrase.order_index,
      phrase: phrase.phrase,
      translation: phrase.translation,
      romanization: phrase.romanization,
      ttsStoragePath: phrase.tts_storage_path,
    });
    phrasesByScenario.set(phrase.scenario_id, current);
  }

  for (const prompt of promptRows) {
    const current = promptsByScenario.get(prompt.scenario_id) ?? [];
    current.push({
      id: prompt.id,
      orderIndex: prompt.order_index,
      prompt: prompt.prompt,
    });
    promptsByScenario.set(prompt.scenario_id, current);
  }

  return scenarioRows.map((row) => ({
    id: row.id,
    dayNumber: row.day_number,
    language: row.language,
    title: row.title,
    description: row.description,
    yourRole: row.your_role,
    partnerRole: row.partner_role,
    phrases: (phrasesByScenario.get(row.id) ?? []).sort(
      (left, right) => left.orderIndex - right.orderIndex,
    ),
    prompts: (promptsByScenario.get(row.id) ?? []).sort(
      (left, right) => left.orderIndex - right.orderIndex,
    ),
  }));
};

const getSql = (env) => {
  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL Pages binding is required.");
  }

  let sql = clients.get(databaseUrl);
  if (!sql) {
    sql = neon(databaseUrl);
    clients.set(databaseUrl, sql);
  }

  return sql;
};

export const parseDayNumber = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const isValidLanguage = (value) =>
  typeof value === "string" && VALID_LANGUAGES.has(value);

export const getDayOverview = async (env, dayNumber, language) => {
  const sql = getSql(env);

  const [scenarioRows, vocabRows, phraseRows, promptRows] = await Promise.all([
    sql`
      select id, day_number, language, title, description, your_role, partner_role
      from daily_scenarios
      where day_number = ${dayNumber}
      order by language asc
    `,
    sql`
      select language, word, translation, romanization, day_number, created_at,
        tts_bucket, tts_storage_path, tts_voice_id, tts_last_generated_at
      from daily_vocabulary
      where day_number = ${dayNumber} and language = ${language}
      order by word asc
      limit 10
    `,
    sql`
      select p.id, p.scenario_id, p.order_index, p.phrase, p.translation,
        p.romanization, p.tts_storage_path
      from daily_scenario_phrases p
      join daily_scenarios s on s.id = p.scenario_id
      where s.day_number = ${dayNumber}
    `,
    sql`
      select p.id, p.scenario_id, p.order_index, p.prompt
      from daily_scenario_prompts p
      join daily_scenarios s on s.id = p.scenario_id
      where s.day_number = ${dayNumber}
    `,
  ]);

  return {
    dayNumber,
    language,
    dailyVocab: vocabRows.map(mapVocabularyRow),
    scenarios: attachScenarioChildren(scenarioRows, phraseRows, promptRows),
  };
};

export const getDailyVocabulary = async (env, dayNumber, language) => {
  const sql = getSql(env);
  const rows = await sql`
    select language, word, translation, romanization, day_number, created_at,
      tts_bucket, tts_storage_path, tts_voice_id, tts_last_generated_at
    from daily_vocabulary
    where day_number = ${dayNumber} and language = ${language}
    order by word asc
    limit 10
  `;

  return rows.map(mapVocabularyRow);
};

export const getScenarioDetail = async (env, scenarioId) => {
  const sql = getSql(env);

  const scenarioRows = await sql`
    select id, day_number, language, title, description, your_role, partner_role
    from daily_scenarios
    where id = ${scenarioId}
    limit 1
  `;

  const scenarioRow = scenarioRows[0];
  if (!scenarioRow) {
    return null;
  }

  const [phraseRows, promptRows, vocabRows] = await Promise.all([
    sql`
      select id, scenario_id, order_index, phrase, translation, romanization, tts_storage_path
      from daily_scenario_phrases
      where scenario_id = ${scenarioId}
    `,
    sql`
      select id, scenario_id, order_index, prompt
      from daily_scenario_prompts
      where scenario_id = ${scenarioId}
    `,
    sql`
      select language, word, translation, romanization, day_number, created_at,
        tts_bucket, tts_storage_path, tts_voice_id, tts_last_generated_at
      from daily_vocabulary
      where day_number = ${scenarioRow.day_number} and language = ${scenarioRow.language}
      order by word asc
      limit 5
    `,
  ]);

  return {
    scenario: attachScenarioChildren([scenarioRow], phraseRows, promptRows)[0],
    vocabHighlights: vocabRows.map(mapVocabularyRow),
  };
};
