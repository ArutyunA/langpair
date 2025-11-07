-- Create table for scenario-specific prompts
CREATE TABLE public.daily_scenario_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.daily_scenarios(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_scenario_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view scenario prompts"
ON public.daily_scenario_prompts
FOR SELECT
USING (auth.role() = 'authenticated');

ALTER TABLE public.daily_scenario_prompts
ADD CONSTRAINT daily_scenario_prompts_unique_order UNIQUE (scenario_id, order_index);
