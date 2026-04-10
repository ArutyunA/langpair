import { pool } from "./db.js";

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
    phrases: (phrasesByScenario.get(row.id) ?? []).sort((left, right) => left.orderIndex - right.orderIndex),
    prompts: (promptsByScenario.get(row.id) ?? []).sort((left, right) => left.orderIndex - right.orderIndex),
  }));
};

const fetchScenarioChildren = async (scenarioIds) => {
  if (scenarioIds.length === 0) {
    return { phraseRows: [], promptRows: [] };
  }

  const [phraseResult, promptResult] = await Promise.all([
    pool.query(
      `
        select id, scenario_id, order_index, phrase, translation, romanization, tts_storage_path
        from daily_scenario_phrases
        where scenario_id = any($1::uuid[])
      `,
      [scenarioIds],
    ),
    pool.query(
      `
        select id, scenario_id, order_index, prompt
        from daily_scenario_prompts
        where scenario_id = any($1::uuid[])
      `,
      [scenarioIds],
    ),
  ]);

  return {
    phraseRows: phraseResult.rows,
    promptRows: promptResult.rows,
  };
};

export const getDayOverview = async (dayNumber, language) => {
  const [scenarioResult, vocabResult] = await Promise.all([
    pool.query(
      `
        select id, day_number, language, title, description, your_role, partner_role
        from daily_scenarios
        where day_number = $1
        order by language asc
      `,
      [dayNumber],
    ),
    pool.query(
      `
        select language, word, translation, romanization, day_number, created_at, tts_bucket, tts_storage_path, tts_voice_id, tts_last_generated_at
        from daily_vocabulary
        where day_number = $1 and language = $2
        order by word asc
        limit 10
      `,
      [dayNumber, language],
    ),
  ]);

  const scenarioIds = scenarioResult.rows.map((row) => row.id);
  const { phraseRows, promptRows } = await fetchScenarioChildren(scenarioIds);

  return {
    dayNumber,
    language,
    dailyVocab: vocabResult.rows.map(mapVocabularyRow),
    scenarios: attachScenarioChildren(scenarioResult.rows, phraseRows, promptRows),
  };
};

export const getScenarioDetail = async (scenarioId) => {
  const scenarioResult = await pool.query(
    `
      select id, day_number, language, title, description, your_role, partner_role
      from daily_scenarios
      where id = $1
      limit 1
    `,
    [scenarioId],
  );

  const scenarioRow = scenarioResult.rows[0];
  if (!scenarioRow) {
    return null;
  }

  const [{ phraseRows, promptRows }, vocabResult] = await Promise.all([
    fetchScenarioChildren([scenarioRow.id]),
    pool.query(
      `
        select language, word, translation, romanization, day_number, created_at, tts_bucket, tts_storage_path, tts_voice_id, tts_last_generated_at
        from daily_vocabulary
        where day_number = $1 and language = $2
        order by word asc
        limit 5
      `,
      [scenarioRow.day_number, scenarioRow.language],
    ),
  ]);

  return {
    scenario: attachScenarioChildren([scenarioRow], phraseRows, promptRows)[0],
    vocabHighlights: vocabResult.rows.map(mapVocabularyRow),
  };
};

export const getDailyVocabulary = async (dayNumber, language) => {
  const result = await pool.query(
    `
      select language, word, translation, romanization, day_number, created_at, tts_bucket, tts_storage_path, tts_voice_id, tts_last_generated_at
      from daily_vocabulary
      where day_number = $1 and language = $2
      order by word asc
      limit 10
    `,
    [dayNumber, language],
  );

  return result.rows.map(mapVocabularyRow);
};
