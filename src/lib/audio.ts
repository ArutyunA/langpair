const AUDIO_BASE_URL = (import.meta.env.VITE_AUDIO_BASE_URL ?? "/audio").replace(/\/$/, "");
const TTS_BUCKET = import.meta.env.VITE_TTS_BUCKET ?? "TTSCanto";
const TTS_SPEAKER_PREFIX = import.meta.env.VITE_TTS_PREFIX ?? "bethany";
const STORAGE_PUBLIC_SEGMENT = "storage/v1/object/public/";

const buildAudioUrl = (relativePath: string) =>
  `${AUDIO_BASE_URL}/${relativePath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;

interface ResolveAudioUrlsOptions {
  lessonDayNumber?: number | null;
  scenarioDayNumber?: number | null;
}

export const resolveAudioUrls = (
  rawPath?: string | null,
  options: ResolveAudioUrlsOptions = {},
) => {
  if (!rawPath) return [];
  const trimmed = rawPath.trim();
  if (!trimmed) return [];

  if (/^https?:\/\//i.test(trimmed)) {
    return [trimmed];
  }

  const stripBucketPrefix = (value: string) => {
    let next = value.replace(/^\/+/, "");
    const storageIndex = next.toLowerCase().indexOf(STORAGE_PUBLIC_SEGMENT);
    if (storageIndex >= 0) {
      next = next.slice(storageIndex + STORAGE_PUBLIC_SEGMENT.length);
    }

    const bucketMarker = `${TTS_BUCKET}/`;
    const bucketIndex = next.indexOf(bucketMarker);
    if (bucketIndex >= 0) {
      next = next.slice(bucketIndex + bucketMarker.length);
    }

    next = next.replace(/^public\//i, "");
    if (next.startsWith(bucketMarker)) {
      next = next.slice(bucketMarker.length);
    }

    return next;
  };

  const normalized = stripBucketPrefix(trimmed);
  const normalizedParts = normalized.split("/").filter(Boolean);
  const baseFilename = normalizedParts.at(-1) ?? normalized;
  const seen = new Set<string>();
  const priorityCandidates: string[] = [];
  const fallbackCandidates: string[] = [];

  const addCandidate = (value?: string | null, priority = false) => {
    const next = value?.trim();
    if (!next || seen.has(next)) return;
    seen.add(next);
    (priority ? priorityCandidates : fallbackCandidates).push(next);
  };

  const filenameDayMatch = baseFilename.match(/(day\d{1,2})/i);
  if (filenameDayMatch) {
    addCandidate(`${TTS_SPEAKER_PREFIX}/${filenameDayMatch[1].toLowerCase()}/${baseFilename}`, true);
  }

  const scenarioDay = options.scenarioDayNumber
    ? `day${String(options.scenarioDayNumber).padStart(2, "0")}`
    : null;
  if (scenarioDay) {
    addCandidate(`${TTS_SPEAKER_PREFIX}/${scenarioDay}/${baseFilename}`, true);
  }

  const lessonDay = options.lessonDayNumber
    ? `day${String(options.lessonDayNumber).padStart(2, "0")}`
    : null;
  if (lessonDay) {
    addCandidate(`${TTS_SPEAKER_PREFIX}/${lessonDay}/${baseFilename}`, true);
  }

  const prefixedNormalized = normalized.startsWith(`${TTS_SPEAKER_PREFIX}/`)
    ? normalized
    : `${TTS_SPEAKER_PREFIX}/${normalized}`;

  addCandidate(prefixedNormalized);
  addCandidate(normalized);

  return [...priorityCandidates, ...fallbackCandidates].map(buildAudioUrl);
};
