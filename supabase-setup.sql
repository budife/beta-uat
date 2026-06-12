-- Create campaign_counters table
CREATE TABLE IF NOT EXISTS campaign_counters (
  id BIGSERIAL PRIMARY KEY,
  campaign_type TEXT UNIQUE NOT NULL,
  value INTEGER DEFAULT 0,
  name TEXT DEFAULT 'Name 1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaign_history table
CREATE TABLE IF NOT EXISTS campaign_history (
  id BIGSERIAL PRIMARY KEY,
  campaign_type TEXT NOT NULL,
  action TEXT NOT NULL,
  value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaign_counters_type ON campaign_counters(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaign_history_type ON campaign_history(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaign_history_created_at ON campaign_history(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE campaign_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_history ENABLE ROW LEVEL SECURITY;

-- Allow public access for read/write operations
CREATE POLICY "Allow public access to campaign_counters" ON campaign_counters
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to campaign_history" ON campaign_history
  FOR ALL USING (true) WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_campaign_counters_updated_at
  BEFORE UPDATE ON campaign_counters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
