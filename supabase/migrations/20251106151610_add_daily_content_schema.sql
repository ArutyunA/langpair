-- Add day_number to daily_vocabulary for rotating curricula
ALTER TABLE public.daily_vocabulary
ADD COLUMN day_number INTEGER NOT NULL DEFAULT 1;

UPDATE public.daily_vocabulary
SET day_number = 1
WHERE day_number IS NULL;

ALTER TABLE public.daily_vocabulary
ALTER COLUMN day_number DROP DEFAULT;

ALTER TABLE public.daily_vocabulary
ADD CONSTRAINT daily_vocabulary_unique_per_day UNIQUE (day_number, language, word);

CREATE INDEX IF NOT EXISTS daily_vocabulary_day_language_idx
ON public.daily_vocabulary (day_number, language);

-- Create daily_scenarios table
CREATE TABLE public.daily_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number INTEGER NOT NULL,
  language TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  your_role TEXT NOT NULL,
  partner_role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view daily scenarios"
ON public.daily_scenarios
FOR SELECT
USING (auth.role() = 'authenticated');

ALTER TABLE public.daily_scenarios
ADD CONSTRAINT daily_scenarios_day_language_unique UNIQUE (day_number, language);

-- Create scenario phrases table
CREATE TABLE public.daily_scenario_phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.daily_scenarios(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  phrase TEXT NOT NULL,
  translation TEXT NOT NULL,
  romanization TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_scenario_phrases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view scenario phrases"
ON public.daily_scenario_phrases
FOR SELECT
USING (auth.role() = 'authenticated');

ALTER TABLE public.daily_scenario_phrases
ADD CONSTRAINT daily_scenario_phrases_unique_order UNIQUE (scenario_id, order_index);
