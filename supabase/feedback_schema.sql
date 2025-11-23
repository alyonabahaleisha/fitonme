-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    email TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow anyone to insert feedback (authenticated or anonymous)
CREATE POLICY "Enable insert for everyone" ON public.feedback
    FOR INSERT WITH CHECK (true);

-- Allow users to see their own feedback (optional, but good practice)
CREATE POLICY "Users can see their own feedback" ON public.feedback
    FOR SELECT USING (auth.uid() = user_id);
