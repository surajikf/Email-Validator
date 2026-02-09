-- Create scheduler_settings table
CREATE TABLE IF NOT EXISTS scheduler_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    frequency TEXT NOT NULL DEFAULT 'daily', -- 'daily', 'hourly', 'weekly'
    time TEXT NOT NULL DEFAULT '10:00', -- HH:MM format (IST implied)
    batch_size INTEGER NOT NULL DEFAULT 50,
    is_active BOOLEAN NOT NULL DEFAULT true,
    day_of_week INTEGER DEFAULT 1, -- 0=Sun, 1=Mon, etc. (for weekly)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert default row if not exists (Singleton pattern)
INSERT INTO scheduler_settings (id, frequency, time, batch_size, is_active)
SELECT '00000000-0000-0000-0000-000000000000', 'daily', '10:00', 50, true
WHERE NOT EXISTS (SELECT 1 FROM scheduler_settings);
