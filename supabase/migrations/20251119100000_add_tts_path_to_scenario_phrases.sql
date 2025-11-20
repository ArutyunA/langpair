-- Add storage path for scenario phrase audio so the API can include it in selects
ALTER TABLE public.daily_scenario_phrases
ADD COLUMN IF NOT EXISTS tts_storage_path TEXT;
