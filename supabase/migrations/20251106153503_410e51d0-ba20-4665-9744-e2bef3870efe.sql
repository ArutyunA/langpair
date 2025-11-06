-- Create friends table for managing connections between users
CREATE TABLE public.friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Users can view their own friend requests and friendships
CREATE POLICY "Users can view their own friends"
ON public.friends
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can send friend requests
CREATE POLICY "Users can send friend requests"
ON public.friends
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update friend requests they received
CREATE POLICY "Users can respond to friend requests"
ON public.friends
FOR UPDATE
USING (auth.uid() = friend_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_friends_updated_at
BEFORE UPDATE ON public.friends
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Make profiles viewable by authenticated users so they can search for friends
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
USING (auth.role() = 'authenticated');