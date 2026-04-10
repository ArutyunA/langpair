import { json } from "../_lib/http.js";
import { getDayOverview } from "../_lib/data.js";

export async function onRequestGet(context) {
  try {
    await getDayOverview(context.env, 1, "cantonese");
    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ ok: false }, { status: 500 });
  }
}
