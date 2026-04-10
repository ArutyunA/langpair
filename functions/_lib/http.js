export const json = (payload, init = {}) =>
  new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers ?? {}),
    },
  });

export const error = (status, message) =>
  json({ error: message }, { status });
