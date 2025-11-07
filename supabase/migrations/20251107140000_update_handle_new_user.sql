-- Ensure usernames are unique and sanitized when new auth users register
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  unique_username TEXT;
  suffix INTEGER := 0;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );

  base_username := lower(regexp_replace(base_username, '[^a-z0-9_]+', '', 'gi'));
  IF base_username = '' THEN
    base_username := 'user';
  END IF;

  unique_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = unique_username) LOOP
    suffix := suffix + 1;
    unique_username := base_username || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, learning_language)
  VALUES (
    NEW.id,
    unique_username,
    COALESCE(NEW.raw_user_meta_data->>'learning_language', 'russian')
  );

  INSERT INTO public.user_progress (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
