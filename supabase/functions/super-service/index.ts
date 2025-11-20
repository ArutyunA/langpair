import { createClient } from "jsr:@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
const bucket = Deno.env.get("TTS_BUCKET") ?? "TTSCanto"
const expiresInSeconds = Number(Deno.env.get("SIGNED_URL_TTL")) || 300
const allowedOrigin = Deno.env.get("CORS_ALLOW_ORIGIN") ?? "*"
const parsedOrigins = allowedOrigin
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean)
const allowedOrigins = parsedOrigins.length > 0 ? parsedOrigins : ["*"]
const allowAllOrigins = allowedOrigins.includes("*")
const defaultAllowHeaders = ["authorization", "x-client-info", "apikey", "content-type"]

const resolveAllowedHeaders = (requestedHeaders?: string | null) => {
  const headerSet = new Set(defaultAllowHeaders)
  if (requestedHeaders) {
    requestedHeaders.split(",").forEach(header => {
      const trimmed = header.trim()
      if (trimmed) headerSet.add(trimmed.toLowerCase())
    })
  }
  return Array.from(headerSet).join(", ")
}

type CorsHeaders = Record<string, string>

const buildCorsHeaders = (requestOrigin: string | null): CorsHeaders => {
  const resolvedOrigin = allowAllOrigins
    ? requestOrigin ?? "*"
    : requestOrigin && allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : allowedOrigins[0] ?? "*"

  const headers: CorsHeaders = {
    "Access-Control-Allow-Origin": resolvedOrigin,
    "Access-Control-Allow-Headers": resolveAllowedHeaders(),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  }
  return headers
}

const isOriginAllowed = (requestOrigin: string | null) => {
  if (allowAllOrigins) return true
  if (!requestOrigin) return false
  return allowedOrigins.includes(requestOrigin)
}

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

export default async function handler(req: Request): Promise<Response> {
  const requestOrigin = req.headers.get("origin")
  const corsHeaders = buildCorsHeaders(requestOrigin)

  if (req.method === "OPTIONS") {
    const requestedHeaders = req.headers.get("access-control-request-headers")
    if (requestedHeaders) {
      corsHeaders["Access-Control-Allow-Headers"] = resolveAllowedHeaders(requestedHeaders)
    }
    console.log("[super-service] OPTIONS preflight", corsHeaders);
    if (!isOriginAllowed(requestOrigin)) {
      return new Response("Origin not allowed", { status: 403, headers: corsHeaders })
    }
    return new Response("ok", { headers: corsHeaders })
  }

  if (!isOriginAllowed(requestOrigin)) {
    return new Response("Origin not allowed", { status: 403, headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    })
  }

  let payload: { path?: string } = {}
  try {
    payload = await req.json()
  } catch (_err) {
    return new Response("Invalid JSON body", { status: 400, headers: corsHeaders })
  }

  const path = payload.path?.trim()
  if (!path) {
    return new Response("Missing `path`", { status: 400, headers: corsHeaders })
  }

  console.log("[super-service] generating audio", { path })

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds)

  if (error || !data?.signedUrl) {
    return new Response(error?.message ?? "Failed to generate signed URL", {
      status: 400,
      headers: corsHeaders,
    })
  }

  const signedUrl = data.signedUrl.startsWith("http")
    ? data.signedUrl
    : `${supabaseUrl}${data.signedUrl}`
  return new Response(JSON.stringify({ signed_url: signedUrl }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
    status: 200,
  })
}
