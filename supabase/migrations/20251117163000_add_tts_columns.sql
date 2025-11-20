-- Add TTS metadata columns to daily_vocabulary
ALTER TABLE public.daily_vocabulary
ADD COLUMN IF NOT EXISTS tts_bucket TEXT,
ADD COLUMN IF NOT EXISTS tts_storage_path TEXT,
ADD COLUMN IF NOT EXISTS tts_voice_id TEXT,
ADD COLUMN IF NOT EXISTS tts_last_generated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS daily_vocabulary_tts_lookup_idx
ON public.daily_vocabulary (day_number, language, word);
