-- Create table to track daily task completion per user
CREATE TABLE public.user_daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vocab_completed BOOLEAN NOT NULL DEFAULT FALSE,
  scenario_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_daily_tasks_unique_day UNIQUE (user_id, task_date)
);

ALTER TABLE public.user_daily_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their daily tasks"
ON public.user_daily_tasks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their daily tasks"
ON public.user_daily_tasks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their daily tasks"
ON public.user_daily_tasks
FOR UPDATE
USING (auth.uid() = user_id);

CREATE TRIGGER update_user_daily_tasks_updated_at
BEFORE UPDATE ON public.user_daily_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
