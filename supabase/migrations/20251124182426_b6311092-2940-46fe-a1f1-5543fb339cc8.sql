-- Create enum for vote modes
CREATE TYPE vote_mode AS ENUM ('single', 'multiple');

-- Create enum for event status
CREATE TYPE event_status AS ENUM ('draft', 'active', 'paused', 'ended');

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  category TEXT NOT NULL,
  number_of_items INTEGER NOT NULL,
  vote_mode vote_mode NOT NULL DEFAULT 'single',
  number_of_choices INTEGER NOT NULL DEFAULT 1,
  number_of_winners INTEGER NOT NULL DEFAULT 1,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status event_status NOT NULL DEFAULT 'draft',
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create items table
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  creator TEXT,
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create voters table
CREATE TABLE public.voters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  voter_code TEXT NOT NULL UNIQUE,
  used BOOLEAN DEFAULT false,
  voted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create votes table
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  voter_code TEXT NOT NULL,
  item_ids UUID[] NOT NULL,
  blockchain_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_items_event_id ON public.items(event_id);
CREATE INDEX idx_voters_event_id ON public.voters(event_id);
CREATE INDEX idx_voters_code ON public.voters(voter_code);
CREATE INDEX idx_votes_event_id ON public.votes(event_id);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events (admins can manage their own events)
CREATE POLICY "Users can view all events"
  ON public.events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Users can update their own events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (auth.uid() = admin_id);

CREATE POLICY "Users can delete their own events"
  ON public.events FOR DELETE
  TO authenticated
  USING (auth.uid() = admin_id);

-- RLS Policies for items (viewable by anyone, manageable by event owner)
CREATE POLICY "Anyone can view items"
  ON public.items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Event owners can insert items"
  ON public.items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_id
      AND events.admin_id = auth.uid()
    )
  );

CREATE POLICY "Event owners can update items"
  ON public.items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_id
      AND events.admin_id = auth.uid()
    )
  );

CREATE POLICY "Event owners can delete items"
  ON public.items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_id
      AND events.admin_id = auth.uid()
    )
  );

-- RLS Policies for voters (viewable by event owner, manageable by event owner)
CREATE POLICY "Event owners can view voters"
  ON public.voters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_id
      AND events.admin_id = auth.uid()
    )
  );

CREATE POLICY "Event owners can create voters"
  ON public.voters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_id
      AND events.admin_id = auth.uid()
    )
  );

CREATE POLICY "Event owners can update voters"
  ON public.voters FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_id
      AND events.admin_id = auth.uid()
    )
  );

CREATE POLICY "Event owners can delete voters"
  ON public.voters FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_id
      AND events.admin_id = auth.uid()
    )
  );

-- RLS Policies for votes (viewable by event owner, insertable by anyone)
CREATE POLICY "Event owners can view votes"
  ON public.votes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_id
      AND events.admin_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert votes"
  ON public.votes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Enable realtime for live results
ALTER PUBLICATION supabase_realtime ADD TABLE public.items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for events table
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();