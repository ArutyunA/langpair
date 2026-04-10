import { getDailyVocabulary, isValidLanguage, parseDayNumber } from "../../../_lib/data.js";
import { error, json } from "../../../_lib/http.js";

export async function onRequestGet(context) {
  const dayNumber = parseDayNumber(context.params.dayNumber);
  const language = new URL(context.request.url).searchParams.get("language");

  if (!dayNumber) {
    return error(400, "Invalid day number.");
  }

  if (!isValidLanguage(language)) {
    return error(400, "Invalid language.");
  }

  try {
    const vocabulary = await getDailyVocabulary(context.env, dayNumber, language);
    return json({ dayNumber, language, vocabulary });
  } catch (err) {
    console.error(err);
    return error(500, "Failed to load vocabulary.");
  }
}
