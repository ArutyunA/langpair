import { getScenarioDetail } from "../../_lib/data.js";
import { error, json } from "../../_lib/http.js";

export async function onRequestGet(context) {
  try {
    const payload = await getScenarioDetail(context.env, context.params.scenarioId);
    if (!payload) {
      return error(404, "Scenario not found.");
    }

    return json(payload);
  } catch (err) {
    console.error(err);
    return error(500, "Failed to load scenario.");
  }
}
